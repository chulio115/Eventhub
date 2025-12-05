import { useState, useEffect, useCallback } from 'react';
import type { EventRow, EventStatus, CostType } from './useEvents';

export interface EventFormState {
  title: string;
  status: EventStatus;
  organizer: string;
  city: string;
  location: string;
  startDate: string;
  endDate: string;
  colleagues: string;
  tags: string;
  costType: CostType;
  costValue: string;
  eventUrl: string;
  attachments: string;
  notes: string;
  linkedinNote: string;
  publicationStatus: boolean;
  booked: boolean;
}

const initialState: EventFormState = {
  title: '',
  status: 'planned',
  organizer: '',
  city: '',
  location: '',
  startDate: '',
  endDate: '',
  colleagues: '',
  tags: '',
  costType: 'participant',
  costValue: '',
  eventUrl: '',
  attachments: '',
  notes: '',
  linkedinNote: '',
  publicationStatus: false,
  booked: false,
};

function eventToFormState(event: EventRow | undefined): EventFormState {
  if (!event) return initialState;

  return {
    title: event.title ?? '',
    status: event.status,
    organizer: event.organizer ?? '',
    city: event.city ?? '',
    location: event.location ?? '',
    startDate: event.start_date ?? '',
    endDate: event.end_date ?? '',
    colleagues: (event.colleagues || []).join(', '),
    tags: (event.tags || []).join(', '),
    costType: event.cost_type,
    costValue: String(event.cost_value ?? ''),
    eventUrl: event.event_url ?? '',
    attachments: (event.attachments || []).join('\n'),
    notes: event.notes ?? '',
    linkedinNote: event.linkedin_note ?? '',
    publicationStatus: event.publication_status,
    booked: event.booked,
  };
}

export function useEventForm(selectedEvent: EventRow | undefined) {
  const [formState, setFormState] = useState<EventFormState>(initialState);

  // Sync form state with selected event
  useEffect(() => {
    setFormState(eventToFormState(selectedEvent));
  }, [selectedEvent?.id]);

  const updateField = useCallback(<K extends keyof EventFormState>(
    field: K,
    value: EventFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(eventToFormState(selectedEvent));
  }, [selectedEvent]);

  // Parse arrays from comma/newline separated strings
  const getParsedArrays = useCallback(() => ({
    colleagues: formState.colleagues
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    tags: formState.tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    attachments: formState.attachments
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  }), [formState.colleagues, formState.tags, formState.attachments]);

  // Check if form has unsaved changes
  const hasChanges = useCallback((): boolean => {
    if (!selectedEvent) return false;

    const parsed = getParsedArrays();
    const costNumeric = Number(formState.costValue.replace(',', '.')) || 0;
    const linkedinPlanned = Boolean(formState.linkedinNote.trim());

    return (
      formState.title.trim() !== (selectedEvent.title ?? '') ||
      formState.organizer.trim() !== (selectedEvent.organizer ?? '') ||
      formState.city.trim() !== (selectedEvent.city ?? '') ||
      formState.location.trim() !== (selectedEvent.location ?? '') ||
      formState.startDate !== (selectedEvent.start_date ?? '') ||
      formState.endDate !== (selectedEvent.end_date ?? '') ||
      formState.status !== selectedEvent.status ||
      formState.booked !== selectedEvent.booked ||
      formState.costType !== selectedEvent.cost_type ||
      costNumeric !== (selectedEvent.cost_value ?? 0) ||
      formState.eventUrl.trim() !== (selectedEvent.event_url ?? '') ||
      formState.notes.trim() !== (selectedEvent.notes ?? '') ||
      linkedinPlanned !== selectedEvent.linkedin_plan ||
      formState.linkedinNote.trim() !== (selectedEvent.linkedin_note ?? '') ||
      formState.publicationStatus !== selectedEvent.publication_status ||
      JSON.stringify(parsed.colleagues) !== JSON.stringify(selectedEvent.colleagues || []) ||
      JSON.stringify(parsed.tags) !== JSON.stringify(selectedEvent.tags || []) ||
      JSON.stringify(parsed.attachments) !== JSON.stringify(selectedEvent.attachments || [])
    );
  }, [formState, selectedEvent, getParsedArrays]);

  // Get update payload for API
  const getUpdatePayload = useCallback(() => {
    if (!selectedEvent) return null;

    const parsed = getParsedArrays();
    const costNumeric = Number(formState.costValue.replace(',', '.')) || 0;
    const linkedinNoteTrimmed = formState.linkedinNote.trim();
    const linkedinPlanned = Boolean(linkedinNoteTrimmed);

    return {
      id: selectedEvent.id,
      title: formState.title.trim(),
      organizer: formState.organizer.trim() || null,
      city: formState.city.trim() || null,
      location: formState.location.trim() || null,
      start_date: formState.startDate || null,
      end_date: formState.endDate || null,
      status: formState.status,
      booked: formState.booked,
      colleagues: parsed.colleagues,
      tags: parsed.tags,
      cost_type: formState.costType,
      cost_value: costNumeric,
      event_url: formState.eventUrl.trim() || null,
      notes: formState.notes.trim() || null,
      attachments: parsed.attachments,
      linkedin_plan: linkedinPlanned,
      linkedin_note: linkedinNoteTrimmed || null,
      publication_status: formState.publicationStatus,
    };
  }, [formState, selectedEvent, getParsedArrays]);

  return {
    formState,
    updateField,
    resetForm,
    hasChanges,
    getUpdatePayload,
    getParsedArrays,
  };
}
