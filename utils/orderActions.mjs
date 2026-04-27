export function resolveOrderActionResult(data, fallbackSuccessMessage, fallbackErrorMessage) {
  if (!data || typeof data.success !== 'boolean') {
    return {
      success: false,
      message: fallbackErrorMessage,
    };
  }

  if (!data.success) {
    return {
      success: false,
      message: data.message || fallbackErrorMessage,
    };
  }

  return {
    success: true,
    message: data.message || fallbackSuccessMessage,
  };
}
