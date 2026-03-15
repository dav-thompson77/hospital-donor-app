export function donorAlertsChannel(profileId: string) {
  return `donor-alerts-${profileId}`;
}

export function donorAppointmentsChannel(profileId: string) {
  return `donor-appointments-${profileId}`;
}

export function staffResponsesChannel() {
  return "staff-alert-responses";
}
