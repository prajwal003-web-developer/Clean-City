import { LIMITS } from "./constants";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateImageFile(file) {
  if (!LIMITS.imageTypes.includes(file.type)) return `${file.name}: use JPEG, PNG, WEBP or GIF.`;
  if (file.size > LIMITS.maxImageBytes) return `${file.name}: larger than ${LIMITS.maxImageBytes / 1024 / 1024} MB.`;
  return null;
}

export function validateReportDetails({ title, category, description }) {
  const errors = {};
  if (!title.trim()) errors.title = "Give the report a short title.";
  else if (title.trim().length > LIMITS.titleMax) errors.title = `Keep the title under ${LIMITS.titleMax} characters.`;
  if (!category) errors.category = "Choose what kind of problem this is.";
  if (!description.trim()) errors.description = "Describe what people will find at this place.";
  else if (description.trim().length > LIMITS.descriptionMax) errors.description = `Keep the description under ${LIMITS.descriptionMax} characters.`;
  return errors;
}

export function validateCredentials(
  { name, email, password, phone },
  { isRegister }
) {
  const errors = {};

  if (isRegister && !name?.trim()) {
    errors.name = "Enter your name.";
  }

  if (!email?.trim()) {
    errors.email = "Enter your email.";
  } else if (!EMAIL.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (isRegister && !phone?.trim()) {
    errors.phone = "Enter your phone number.";
  } else if (
    isRegister &&
    !/^\+?[0-9\s()-]{7,20}$/.test(phone.trim())
  ) {
    errors.phone = "Enter a valid phone number.";
  }

  if (!password) {
    errors.password = "Enter your password.";
  } else if (isRegister && password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }

  return errors;
}