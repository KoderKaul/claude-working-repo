import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteEntry, saveCheckIn, updateEntry } from '../db/db';
import { LogForm, draftFromEntry } from './LogForm';
import { CheckInForm } from './CheckInForm';
import { Modal, useToast } from './ui';

export function EditEntryModal({ id, onClose }: { id: string; onClose: () => void }) {
  const toast = useToast();
  const entry = useLiveQuery(() => db.entries.get(id), [id]);
  if (!entry) return null;
  return (
    <Modal onClose={onClose} label="Edit entry">
      <LogForm
        title="Edit entry"
        initial={draftFromEntry(entry)}
        onCancel={onClose}
        onSave={async (d) => {
          await updateEntry(id, { ...d, demo: false });
          toast('Entry updated');
          onClose();
        }}
        onDelete={async () => {
          if (!confirm('Delete this entry?')) return;
          await deleteEntry(id);
          toast('Entry deleted');
          onClose();
        }}
      />
    </Modal>
  );
}

export function CheckInModal({ date, onClose }: { date: string; onClose: () => void }) {
  const toast = useToast();
  const existing = useLiveQuery(async () => (await db.checkins.get(date)) ?? null, [date]);
  if (existing === undefined) return null;
  return (
    <Modal onClose={onClose} label="Daily check-in">
      <CheckInForm
        initial={existing ?? { date }}
        onCancel={onClose}
        onSave={async (c) => {
          await saveCheckIn(c);
          toast('Check-in saved');
          onClose();
        }}
      />
    </Modal>
  );
}
