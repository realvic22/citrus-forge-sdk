import { MilestoneJournalResponseError } from './errors';

export type CVJson = {
  type?: string;
  value?: unknown;
  success?: boolean;
};

export function unwrapReadOnlyResponse(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') {
    throw new MilestoneJournalResponseError('Invalid read-only response payload');
  }

  const maybe = raw as CVJson;
  if (typeof maybe.success === 'boolean') {
    if (!maybe.success) {
      throw new MilestoneJournalResponseError('Read-only call returned err response');
    }
    return maybe.value;
  }

  return maybe.value;
}

export function asBigInt(value: unknown, fieldName: string): bigint {
  if (value && typeof value === 'object' && 'value' in value) {
    return asBigInt((value as { value: unknown }).value, fieldName);
  }
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  throw new MilestoneJournalResponseError(`Expected uint for ${fieldName}`);
}

export function asBool(value: unknown, fieldName: string): boolean {
  if (value && typeof value === 'object' && 'value' in value) {
    return asBool((value as { value: unknown }).value, fieldName);
  }
  if (typeof value === 'boolean') return value;
  throw new MilestoneJournalResponseError(`Expected bool for ${fieldName}`);
}

export function asText(value: unknown, fieldName: string): string {
  if (value && typeof value === 'object' && 'value' in value) {
    return asText((value as { value: unknown }).value, fieldName);
  }
  if (value && typeof value === 'object') {
    const maybe = value as { address?: unknown; contractName?: unknown };
    if (typeof maybe.address === 'string') {
      return typeof maybe.contractName === 'string' ? `${maybe.address}.${maybe.contractName}` : maybe.address;
    }
  }
  if (typeof value === 'string') return value;
  throw new MilestoneJournalResponseError(`Expected string for ${fieldName}`);
}

export function asObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    throw new MilestoneJournalResponseError(`Expected object for ${fieldName}`);
  }

  const typed = value as CVJson;
  if (typed.value && typeof typed.value === 'object') {
    return typed.value as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

export function unwrapOptional<T>(value: unknown, fieldName: string): T | null {
  if (!value || typeof value !== 'object') {
    throw new MilestoneJournalResponseError(`Expected optional for ${fieldName}`);
  }

  const typed = value as CVJson;
  if (typeof typed.type === 'string' && typed.type.includes('optional')) {
    return typed.value === undefined || typed.value === null ? null : (typed.value as T);
  }
  if (typed.type === 'optional-none' || typed.type === 'none') return null;
  if (typed.type === 'optional-some' || typed.type === 'some') return (typed.value as T) ?? null;
  return value as T;
}
