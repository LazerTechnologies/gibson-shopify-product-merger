export const sanitizeHandle = (handle: string) => {
  const formattedHandle = handle
    ?.replace(/\s+/g, '-');

  const sanitizedHandle = formattedHandle
    ?.toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .substring(0, 60);

  return sanitizedHandle;
};