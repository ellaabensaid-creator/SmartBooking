export default function SlotPicker({ slots, value, onChange }) {
  return (
    <div className="slot-grid">
      {slots.length === 0 ? (
        <p className="muted">Aucun créneau disponible pour cette date.</p>
      ) : (
        slots.map((slot) => (
          <button
            key={`${slot.time}-${slot.endTime}`}
            type="button"
            className={value === slot.time ? 'slot active' : 'slot'}
            onClick={() => onChange(slot.time)}
          >
            {slot.time.slice(0, 5)} - {slot.endTime.slice(0, 5)}
          </button>
        ))
      )}
    </div>
  );
}
