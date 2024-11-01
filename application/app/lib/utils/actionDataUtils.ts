type ActionDataError = {
  error: {
    message: string;
  };
};

type ActionDataSuccess = {
  message: string;
};

type ActionData = ActionDataError | ActionDataSuccess | null;

function isActionDataError(
  actionData: ActionData,
): actionData is ActionDataError {
  if (actionData && 'error' in actionData && 'message' in actionData.error) {
    return true;
  }
  return false;
}

function isActionDataSuccess(
  actionData: ActionData,
): actionData is ActionDataSuccess {
  if (actionData && 'message' in actionData) {
    return true;
  }
  return false;
}

export { isActionDataError, isActionDataSuccess };
