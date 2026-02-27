import { setMessage } from './shared';

export const initTimezoneMeetingPlanner = () => {
  const rowsContainer = document.getElementById('timezone-rows');
  const addRowButton = document.getElementById('add-timezone-row');
  const message = document.getElementById('timezone-message');
  const overlapList = document.getElementById('timezone-overlap-list');
  const scales = document.getElementById('timezone-scales');
  const chart = document.getElementById('timezone-chart');
  if (!rowsContainer || !message || !overlapList || !chart || !scales) return;

  const fallbackZones = [
    'UTC',
    'America/Los_Angeles',
    'America/New_York',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];

  const supportedZones =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : fallbackZones;

  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const preferredZones = [
    localZone,
    'UTC',
    'America/Los_Angeles',
    'America/New_York',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];
  const orderedZones = [
    ...new Set([
      ...preferredZones.filter((zone) => supportedZones.includes(zone)),
      ...supportedZones,
    ]),
  ];

  const timeToMinutes = (value) => {
    const [hoursRaw, minutesRaw] = String(value || '').split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }
    return hours * 60 + minutes;
  };

  const minutesToTime = (value) => {
    const safe = ((value % 1440) + 1440) % 1440;
    const hours = Math.floor(safe / 60);
    const minutes = safe % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const getCurrentDatePartsInZone = (timeZone) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
      }, {});

    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
    };
  };

  const getCurrentUtcDateParts = () => {
    const now = new Date();
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
    };
  };

  const formatTickLabel = (utcBaseParts, utcMinutes, timeZone) => {
    const baseMs = Date.UTC(
      utcBaseParts.year,
      utcBaseParts.month - 1,
      utcBaseParts.day,
      0,
      0,
      0
    );
    const tickDate = new Date(baseMs + utcMinutes * 60000);

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(tickDate)
      .reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
      }, {});

    const label = `${parts.hour}:${parts.minute}`;

    const utcMidnightMs = baseMs;
    const localMidnightAsUtcMs = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day)
    );
    const dayDelta = Math.round(
      (localMidnightAsUtcMs - utcMidnightMs) / 86400000
    );

    return { label, dayDelta };
  };

  const getTimeZoneOffsetMinutes = (date, timeZone) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
      }, {});

    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    return (asUtc - date.getTime()) / 60000;
  };

  const zonedMinutesToUtcMinutes = (minutesInDay, timeZone, dateParts) => {
    const hour = Math.floor(minutesInDay / 60);
    const minute = minutesInDay % 60;
    let guess = Date.UTC(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,
      hour,
      minute,
      0
    );

    for (let i = 0; i < 3; i += 1) {
      const offset = getTimeZoneOffsetMinutes(new Date(guess), timeZone);
      guess =
        Date.UTC(
          dateParts.year,
          dateParts.month - 1,
          dateParts.day,
          hour,
          minute,
          0
        ) -
        offset * 60000;
    }

    const utcDate = new Date(guess);
    return utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes();
  };

  const splitLocalInterval = (start, end) => {
    if (start === end) return null;
    if (end > start) return [[start, end]];
    return [
      [start, 1440],
      [0, end],
    ];
  };

  const toUtcSegments = (start, end, zone, dateParts) => {
    const localSegments = splitLocalInterval(start, end);
    if (!localSegments) return null;
    const segments = [];

    for (const [segmentStart, segmentEnd] of localSegments) {
      const utcStart = zonedMinutesToUtcMinutes(segmentStart, zone, dateParts);
      const utcEnd = zonedMinutesToUtcMinutes(segmentEnd, zone, dateParts);

      if (utcStart === utcEnd) continue;

      if (utcEnd > utcStart) {
        segments.push([utcStart, utcEnd]);
      } else {
        segments.push([utcStart, 1440], [0, utcEnd]);
      }
    }

    return segments;
  };

  const mergeRanges = (ranges) => {
    if (ranges.length === 0) return [];
    const sorted = ranges
      .map(([start, end]) => [start, end])
      .sort((a, b) => a[0] - b[0]);
    const merged = [sorted[0]];
    for (let i = 1; i < sorted.length; i += 1) {
      const [start, end] = sorted[i];
      const last = merged[merged.length - 1];
      if (start <= last[1]) {
        last[1] = Math.max(last[1], end);
      } else {
        merged.push([start, end]);
      }
    }
    return merged;
  };

  const overlapRanges = (rows) => {
    if (rows.length === 0) return [];
    const events = [];
    for (const row of rows) {
      for (const [start, end] of row.utcSegments) {
        events.push([start, 1], [end, -1]);
      }
    }
    if (events.length === 0) return [];
    events.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

    const overlaps = [];
    let count = 0;
    let cursor = 0;
    let index = 0;
    while (index < events.length) {
      const eventMinute = events[index][0];
      if (count === rows.length && cursor < eventMinute) {
        overlaps.push([cursor, eventMinute]);
      }
      while (index < events.length && events[index][0] === eventMinute) {
        count += events[index][1];
        index += 1;
      }
      cursor = eventMinute;
    }
    if (count === rows.length && cursor < 1440) {
      overlaps.push([cursor, 1440]);
    }
    return mergeRanges(overlaps);
  };

  const durationLabel = (start, end) => {
    const total = Math.max(0, end - start);
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  };

  const formatLocalInterval = (startMinutes, endMinutes) =>
    `${minutesToTime(startMinutes)}-${minutesToTime(endMinutes)}`;

  const renderSegments = (bar, segments, className) => {
    for (const [start, end] of segments) {
      const segment = document.createElement('div');
      segment.className = `timeline-segment ${className}`;
      segment.style.left = `${(start / 1440) * 100}%`;
      segment.style.width = `${((end - start) / 1440) * 100}%`;
      bar.appendChild(segment);
    }
  };

  const renderMajorTicks = (bar) => {
    // Highlight the separators that correspond to the labeled axis ticks above (06/12/18).
    // These are fixed UTC-minute positions and therefore align with every row's local axis ticks.
    const major = [0, 360, 720, 1080, 1440];
    for (const minute of major) {
      const tick = document.createElement('div');
      tick.className = 'timeline-major-tick';
      if (minute === 0 || minute === 1440) {
        tick.classList.add('timeline-major-tick-boundary');
      }
      tick.style.left = `${(minute / 1440) * 100}%`;
      bar.appendChild(tick);
    }
  };

  const renderTimelineRow = (label, segments, className) => {
    const row = document.createElement('div');
    row.className = 'timeline-row';
    const labelNode = document.createElement('div');
    labelNode.className = 'timeline-label';
    labelNode.textContent = label;
    const bar = document.createElement('div');
    bar.className = 'timeline-bar';
    renderMajorTicks(bar);
    renderSegments(bar, segments, className);
    row.append(labelNode, bar);
    return row;
  };

  const renderScaleRow = (zone, ticks, note = '') => {
    const row = document.createElement('div');
    row.className = 'timezone-scale';

    const label = document.createElement('div');
    label.className = 'scale-label';
    const strong = document.createElement('strong');
    strong.textContent = zone;
    label.appendChild(strong);
    if (note) {
      const small = document.createElement('small');
      small.textContent = note;
      label.appendChild(small);
    }

    const tickRow = document.createElement('div');
    tickRow.className = 'scale-ticks';

    for (let i = 0; i < ticks.length; i += 1) {
      const tick = ticks[i];
      const node = document.createElement('span');
      node.textContent = tick.label;
      const pos = Number(tick.pos);
      const clamped = Number.isFinite(pos)
        ? Math.min(100, Math.max(0, pos))
        : (i / Math.max(1, ticks.length - 1)) * 100;
      node.style.left = `${clamped}%`;
      node.style.transform =
        clamped <= 0
          ? 'translateX(0)'
          : clamped >= 100
            ? 'translateX(-100%)'
            : 'translateX(-50%)';
      if (tick.dayDelta === 1) {
        node.dataset.daydelta = '1';
        node.dataset.daydeltaLabel = '+1';
      } else if (tick.dayDelta === -1) {
        node.dataset.daydelta = '-1';
        node.dataset.daydeltaLabel = '-1';
      }
      tickRow.appendChild(node);
    }

    row.append(label, tickRow);
    return row;
  };

  const renderGroup = (zone, scaleTicks, barLabel, segments, className) => {
    const group = document.createElement('div');
    group.className = 'timeline-group';
    group.appendChild(renderScaleRow(zone, scaleTicks, 'local time'));
    group.appendChild(renderTimelineRow(barLabel, segments, className));
    return group;
  };

  const updateRemoveButtons = () => {
    const rows = Array.from(rowsContainer.querySelectorAll('.timezone-row'));
    rows.forEach((row) => {
      const button = row.querySelector('[data-remove-row]');
      if (button instanceof HTMLButtonElement) {
        button.disabled = rows.length <= 1;
      }
    });
  };

  const createZoneOptions = (selectedZone) =>
    orderedZones
      .map((zone) => {
        const selected = zone === selectedZone ? ' selected' : '';
        return `<option value="${zone}"${selected}>${zone}</option>`;
      })
      .join('');

  const addRow = (zone = localZone, start = '09:00', end = '17:00') => {
    const row = document.createElement('div');
    row.className = 'timezone-row';
    row.innerHTML = `
      <label>
        Timezone
        <select data-zone>
          ${createZoneOptions(zone)}
        </select>
      </label>
      <label>
        Local start
        <input data-start type="time" value="${start}" />
      </label>
      <label>
        Local end
        <input data-end type="time" value="${end}" />
      </label>
      <button type="button" class="secondary-btn" data-remove-row>Remove</button>
    `;
    rowsContainer.appendChild(row);
    updateRemoveButtons();
    render();
  };

  const render = () => {
    const rowNodes = Array.from(
      rowsContainer.querySelectorAll('.timezone-row')
    );
    if (rowNodes.length === 0) {
      setMessage(message, 'Add at least one timezone row.', true);
      overlapList.innerHTML = '<li>Add a row to calculate overlap.</li>';
      scales.innerHTML = '';
      chart.innerHTML = '';
      return;
    }

    const datePartsByZone = new Map();
    const parsedRows = [];
    const utcBaseParts = getCurrentUtcDateParts();

    for (const row of rowNodes) {
      const zoneInput = row.querySelector('[data-zone]');
      const startInput = row.querySelector('[data-start]');
      const endInput = row.querySelector('[data-end]');
      if (
        !(zoneInput instanceof HTMLSelectElement) ||
        !(startInput instanceof HTMLInputElement) ||
        !(endInput instanceof HTMLInputElement)
      ) {
        continue;
      }

      const zone = zoneInput.value;
      const startMinutes = timeToMinutes(startInput.value);
      const endMinutes = timeToMinutes(endInput.value);

      if (startMinutes === null || endMinutes === null) {
        setMessage(
          message,
          'Every row needs valid local start/end times.',
          true
        );
        return;
      }
      if (startMinutes === endMinutes) {
        setMessage(message, 'Start and end cannot be the same in a row.', true);
        return;
      }

      if (!datePartsByZone.has(zone)) {
        datePartsByZone.set(zone, getCurrentDatePartsInZone(zone));
      }

      const utcSegments = toUtcSegments(
        startMinutes,
        endMinutes,
        zone,
        datePartsByZone.get(zone)
      );

      if (!utcSegments) {
        setMessage(message, `Invalid interval for ${zone}.`, true);
        return;
      }

      parsedRows.push({
        zone,
        startMinutes,
        endMinutes,
        utcSegments: mergeRanges(utcSegments),
      });
    }

    const overlaps = overlapRanges(parsedRows);

    const tickMinutes = [0, 360, 720, 1080, 1440];

    // One global reference scale in UTC.
    scales.innerHTML = '';
    scales.appendChild(
      renderScaleRow(
        'UTC',
        tickMinutes.map((minute) => ({
          label: minutesToTime(minute),
          dayDelta: minute === 1440 ? 1 : 0,
          pos: (minute / 1440) * 100,
        })),
        'reference axis'
      )
    );

    chart.innerHTML = '';

    const overlapRow = renderTimelineRow(
      'Shared overlap (UTC)',
      overlaps,
      'timeline-segment-overlap'
    );
    overlapRow.classList.add('utc-overlap-row');
    chart.appendChild(overlapRow);

    const groups = document.createElement('div');
    groups.className = 'timeline-groups';
    for (const row of parsedRows) {
      const ticks = tickMinutes.map((minute) => ({
        ...formatTickLabel(utcBaseParts, minute, row.zone),
        pos: (minute / 1440) * 100,
      }));
      const barLabel = `${row.zone} · ${formatLocalInterval(row.startMinutes, row.endMinutes)}`;
      groups.appendChild(
        renderGroup(
          row.zone,
          ticks,
          barLabel,
          row.utcSegments,
          'timeline-segment-row'
        )
      );
    }
    chart.appendChild(groups);

    if (overlaps.length === 0) {
      overlapList.innerHTML =
        '<li>No shared overlap window across all rows.</li>';
    } else {
      overlapList.innerHTML = overlaps
        .map(
          ([start, end]) =>
            `<li>${minutesToTime(start)}-${minutesToTime(end)} UTC (${durationLabel(start, end)})</li>`
        )
        .join('');
    }

    setMessage(
      message,
      `Rendered overlap for ${parsedRows.length} row(s) using current timezone offsets.`
    );
  };

  rowsContainer.addEventListener('input', render);
  rowsContainer.addEventListener('click', (event) => {
    const target = event.target;
    if (
      !(target instanceof HTMLElement) ||
      !target.matches('[data-remove-row]')
    )
      return;
    const row = target.closest('.timezone-row');
    row?.remove();
    updateRemoveButtons();
    render();
  });
  addRowButton?.addEventListener('click', () => addRow(localZone));

  addRow('Europe/Berlin', '09:00', '17:00');
  addRow('America/New_York', '09:00', '17:00');
  addRow('Asia/Singapore', '09:00', '17:00');
};
