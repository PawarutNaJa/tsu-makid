export const parseApiResponse = async (response, emptyValue = {}) => {
  const body = await response.text();
  let data = emptyValue;

  if (body.trim()) {
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error(`Server returned an invalid response (${response.status})`);
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
};
