const getIncidentLabel = (data) => {
  if (data?.history?.length && data.history[0]?.display_id) {
    return `INC-${String(data.history[0].display_id).padStart(4, "0")}`;
  }

  return "INC- (will be assigned)";
};

export default getIncidentLabel;
