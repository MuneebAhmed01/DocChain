export const buildJitsiRoomId = ({ doctorId, appointmentId }) => {
  return `doc_${doctorId}appt${appointmentId}`;
};

export const buildMeetingLink = (roomId) => {
  return `https://meet.jit.si/${roomId}`;
};

export const buildAppointmentMeetingLink = ({ doctorId, appointmentId }) => {
  const roomId = buildJitsiRoomId({ doctorId, appointmentId });
  return buildMeetingLink(roomId);
};
