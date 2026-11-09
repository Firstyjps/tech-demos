const APP_NAME = /^[A-Za-z0-9][A-Za-z0-9._+:-]{0,80}$/
const WINDOW_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/
const REF_ID = /^@[a-z0-9]+:e[1-9][0-9]*$/i

export function assertAppName(value: string): string {
  const name = value.trim()
  if (!APP_NAME.test(name) || name.includes("..")) {
    throw new Error(
      "App name must be the list-apps name, such as mousepad or python3.12.",
    )
  }
  return name
}

export function assertWindowId(value: string): string {
  const id = value.trim()
  if (!WINDOW_ID.test(id)) {
    throw new Error("Window id is not in the form list-windows returns.")
  }
  return id
}

export function assertRef(value: string): string {
  const ref = value.trim()
  if (!REF_ID.test(ref)) {
    throw new Error(
      "Ref must be the qualified form snapshot prints, such as @s26u7pv9qta5g4:e6.",
    )
  }
  return ref
}

export function assertText(value: string): string {
  if (value.length === 0) {
    throw new Error("Type needs some text.")
  }
  if (value.includes("\0")) {
    throw new Error("Text cannot contain a null character.")
  }
  if (Buffer.byteLength(value, "utf8") > 4000) {
    throw new Error("Text is limited to 4000 bytes in this playground.")
  }
  return value
}
