/**
 * Face-matching helpers.
 *
 * Recognition is a nearest-neighbour search: the live 128-dimension descriptor
 * is compared against every enrolled descriptor using euclidean distance, and
 * the closest one wins — provided it falls inside the acceptance threshold.
 * A larger threshold accepts more matches but risks recognising the wrong
 * student; a smaller one is stricter but may reject a genuine student.
 */

export const DESCRIPTOR_LENGTH = 128;

export const MATCH_THRESHOLD = Number(
  process.env.FACE_MATCH_THRESHOLD || process.env.NEXT_PUBLIC_FACE_MATCH_THRESHOLD || 0.5
);

export function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function isValidDescriptor(d) {
  return (
    Array.isArray(d) &&
    d.length === DESCRIPTOR_LENGTH &&
    d.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

/**
 * Find the closest enrolled student for a single live descriptor.
 *
 * @param {number[]} descriptor       live face vector
 * @param {Array<{_id, fullName, matricNo, faceDescriptors}>} students
 * @param {number} threshold          maximum acceptable distance
 * @returns {{student, distance, confidence}|null}
 */
export function findBestMatch(descriptor, students, threshold = MATCH_THRESHOLD) {
  let best = null;

  for (const student of students) {
    for (const enrolled of student.faceDescriptors || []) {
      if (enrolled.length !== descriptor.length) continue;
      const distance = euclideanDistance(descriptor, enrolled);
      if (!best || distance < best.distance) best = { student, distance };
    }
  }

  if (!best || best.distance > threshold) return null;

  return {
    student: best.student,
    distance: best.distance,
    // Map distance onto a friendlier 0-1 score for display.
    confidence: Math.max(0, Math.min(1, 1 - best.distance / threshold)),
  };
}
