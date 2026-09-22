/** Presentation only. Never use this for API roles, routes, identifiers or persisted values. */
export function traineeWording(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/volunteering/gi, (value) => (value[0] === 'V' ? 'Training' : 'training'))
    .replace(/volunteers/gi, (value) => (value[0] === 'V' ? 'Trainees' : 'trainees'))
    .replace(/volunteer/gi, (value) => (value[0] === 'V' ? 'Trainee' : 'trainee'))
    .replace(/متطوعين/g, 'متدربين')
    .replace(/متطوعون/g, 'متدربون')
    .replace(/متطوع/g, 'متدرب')
    .replace(/تطوّع/g, 'تدرّب')
    .replace(/تطوع/g, 'تدريب');
}
