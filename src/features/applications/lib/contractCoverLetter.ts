export function removeContractPackageFooter(body: string): string {
  return body.replace(
    /\r?\n\s*Certification package:[ \t]*\r?\n(?:\/file\/|\/download_file\/|https?:\/\/|s3:\/\/)[^\r\n]+\s*$/i,
    '',
  )
}
