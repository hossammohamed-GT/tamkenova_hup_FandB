import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';


export function fieldValidationException(fields: Record<string, string[]>) {
  return new BadRequestException({
    error_code: 'VALIDATION_FAILED',
    message: Object.entries(fields).flatMap(([path, messages]) =>
      messages.map((message) => `${path}: ${message}`),
    ),
    field_errors: fields,
  });
}
export function invalidField(path: string, message: string): never {
  throw fieldValidationException({ [path]: [message] });
}
export function validationFields(
  errors: ValidationError[],
  prefix = '',
): Record<string, string[]> {
  const fields: Record<string, string[]> = Object.create(null);
  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) fields[path] = Object.values(error.constraints);
    Object.assign(fields, validationFields(error.children || [], path));
  }
  return fields;
}
export function applicationValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: { target: false, value: false },
    exceptionFactory: (errors) =>
      fieldValidationException(validationFields(errors)),
  });
}
