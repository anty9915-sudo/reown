const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NICKNAME_PATTERN = /^[°¡-ÆRa-zA-Z0-9]{2,20}$/

const validateBody = (body, allowedFields) => {
  const details = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { body: '¿äÃ» º»¹®Àº JSON °´Ã¼¿©¾ß ÇÕ´Ï´Ù.' }
  }

  for (const field of Object.keys(body)) {
    if (!allowedFields.includes(field)) {
      details[field] = 'Á¤ÀÇµÇÁö ¾ÊÀº ÇÊµåÀÔ´Ï´Ù.'
    }
  }

  return details
}

const validateEmail = (email, details) => {
  if (typeof email !== 'string') {
    details.email = 'ÀÌ¸ŞÀÏÀº ¹®ÀÚ¿­ÀÌ¾î¾ß ÇÕ´Ï´Ù.'
    return
  }

  const normalizedEmail = email.trim().toLowerCase()

  if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 255) {
    details.email = '¿Ã¹Ù¸¥ ÀÌ¸ŞÀÏÀ» ÀÔ·ÂÇØ ÁÖ¼¼¿ä.'
  }
}

const validatePassword = (password, details) => {
  if (typeof password !== 'string') {
    details.password = 'ºñ¹Ğ¹øÈ£´Â ¹®ÀÚ¿­ÀÌ¾î¾ß ÇÕ´Ï´Ù.'
    return
  }

  if (password.length < 8 || password.length > 20) {
    details.password = 'ºñ¹Ğ¹øÈ£´Â 8ÀÚ ÀÌ»ó 20ÀÚ ÀÌÇÏ¿©¾ß ÇÕ´Ï´Ù.'
  }
}

// È¸¿ø°¡ÀÔ ¿äÃ»¿¡ ÇÊ¿äÇÑ ÀÌ¸ŞÀÏ, ºñ¹Ğ¹øÈ£, ´Ğ³×ÀÓÀ» °Ë»çÇÑ´Ù.
export const validateSignup = (body) => {
  const details = validateBody(body, ['email', 'password', 'nickname'])

  validateEmail(body?.email, details)
  validatePassword(body?.password, details)

  if (typeof body?.nickname !== 'string') {
    details.nickname = '´Ğ³×ÀÓÀº ¹®ÀÚ¿­ÀÌ¾î¾ß ÇÕ´Ï´Ù.'
  } else if (!NICKNAME_PATTERN.test(body.nickname)) {
    details.nickname =
      '´Ğ³×ÀÓÀº ÇÑ±Û, ¿µ¹®, ¼ıÀÚ·Î 2ÀÚ ÀÌ»ó 20ÀÚ ÀÌÇÏ¿©¾ß ÇÕ´Ï´Ù.'
  }

  return details
}

// ·Î±×ÀÎ ¿äÃ»¿¡ ÇÊ¿äÇÑ ÀÌ¸ŞÀÏ°ú ºñ¹Ğ¹øÈ£¸¦ °Ë»çÇÑ´Ù.
export const validateLogin = (body) => {
  const details = validateBody(body, ['email', 'password'])

  validateEmail(body?.email, details)
  validatePassword(body?.password, details)

  return details
}
