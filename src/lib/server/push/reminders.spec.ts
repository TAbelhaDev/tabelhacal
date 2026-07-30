import { describe, it, expect } from 'vitest';
import {
	parseReminderOffsets,
	serializeReminderOffsets,
	formatOffsetLabel,
	DEFAULT_REMINDER_OFFSETS_MINUTES,
	MAX_REMINDER_OFFSETS
} from './reminders';

describe('parseReminderOffsets', () => {
	it('parses a valid JSON array of minutes', () => {
		expect(parseReminderOffsets('[30,1440]')).toEqual([30, 1440]);
	});

	it('returns an empty array when reminders are disabled', () => {
		expect(parseReminderOffsets('[]')).toEqual([]);
	});

	it('falls back to the default on invalid JSON', () => {
		expect(parseReminderOffsets('not-json')).toEqual(DEFAULT_REMINDER_OFFSETS_MINUTES);
	});

	it('falls back to the default when the JSON is not an array', () => {
		expect(parseReminderOffsets('{"a":1}')).toEqual(DEFAULT_REMINDER_OFFSETS_MINUTES);
	});

	it('drops non-integer, non-positive and out-of-range values', () => {
		expect(parseReminderOffsets('[30,-5,1.5,0,999999]')).toEqual([30]);
	});

	it('caps the result at MAX_REMINDER_OFFSETS entries', () => {
		const many = Array.from({ length: MAX_REMINDER_OFFSETS + 3 }, (_, i) => i + 1);
		expect(parseReminderOffsets(JSON.stringify(many))).toHaveLength(MAX_REMINDER_OFFSETS);
	});
});

describe('serializeReminderOffsets', () => {
	it('dedupes, sorts and caps to MAX_REMINDER_OFFSETS', () => {
		const many = Array.from({ length: MAX_REMINDER_OFFSETS + 2 }, (_, i) => i + 1).reverse();
		const serialized = serializeReminderOffsets([...many, ...many]);
		expect(JSON.parse(serialized)).toHaveLength(MAX_REMINDER_OFFSETS);
		expect(JSON.parse(serialized)).toEqual(
			Array.from({ length: MAX_REMINDER_OFFSETS }, (_, i) => i + 1)
		);
	});

	it('round-trips through parseReminderOffsets', () => {
		const serialized = serializeReminderOffsets([1440, 30]);
		expect(parseReminderOffsets(serialized)).toEqual([30, 1440]);
	});
});

describe('formatOffsetLabel', () => {
	it('formats minutes under an hour', () => {
		expect(formatOffsetLabel(30)).toBe('30 min');
	});

	it('formats whole hours', () => {
		expect(formatOffsetLabel(60)).toBe('1 hora');
		expect(formatOffsetLabel(120)).toBe('2 horas');
	});

	it('formats whole days', () => {
		expect(formatOffsetLabel(1440)).toBe('1 dia');
		expect(formatOffsetLabel(2880)).toBe('2 dias');
	});

	it('falls back to minutes when it does not divide evenly into hours/days', () => {
		expect(formatOffsetLabel(90)).toBe('90 min');
	});
});
