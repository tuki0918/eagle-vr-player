export function getEagleItemMediaSource(eagleItem) {
  if (
    typeof eagleItem?.filePath !== "string" ||
    eagleItem.filePath.length === 0 ||
    typeof eagleItem.fileURL !== "string" ||
    eagleItem.fileURL.length === 0
  ) {
    return null;
  }

  try {
    const fileUrl = new URL(eagleItem.fileURL);
    if (
      fileUrl.protocol !== "file:" ||
      fileUrl.username ||
      fileUrl.password ||
      fileUrl.port ||
      fileUrl.search ||
      fileUrl.hash
    ) {
      return null;
    }

    return fileUrl.href;
  } catch {
    return null;
  }
}
