import { setMessage } from './shared';

export const initSubnetPlanner = () => {
  const MAX_RENDERED_ROWS = 512;
  const form = document.getElementById('subnet-form');
  if (!form) return;

  const table = document.getElementById('subnet-table');
  const tbody = table?.querySelector('tbody');
  const message = document.getElementById('subnet-message');
  const slider = document.getElementById('splitLevel');
  const splitSummary = document.getElementById('splitSummary');
  const copyButton = document.getElementById('copy-subnets');

  const ipToInt = (ip) => {
    const parts = ip.split('.').map((v) => Number(v));
    if (
      parts.length !== 4 ||
      parts.some((v) => !Number.isInteger(v) || v < 0 || v > 255)
    ) {
      return null;
    }
    return (
      ((parts[0] << 24) >>> 0) +
      ((parts[1] << 16) >>> 0) +
      ((parts[2] << 8) >>> 0) +
      (parts[3] >>> 0)
    );
  };

  const intToIp = (intVal) =>
    [
      (intVal >>> 24) & 255,
      (intVal >>> 16) & 255,
      (intVal >>> 8) & 255,
      intVal & 255,
    ].join('.');

  const parseCidr = (value) => {
    const [ip, prefixRaw] = value.trim().split('/');
    const prefix = Number(prefixRaw);
    if (!ip || !Number.isInteger(prefix) || prefix < 0 || prefix > 32)
      return null;
    const ipInt = ipToInt(ip);
    if (ipInt === null) return null;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const network = ipInt & mask;
    return { prefix, network };
  };

  const clearTable = () => {
    if (tbody) tbody.innerHTML = '';
    if (table) table.hidden = true;
    if (copyButton) copyButton.disabled = true;
  };

  const appendCell = (row, text) => {
    const td = document.createElement('td');
    td.textContent = text;
    row.appendChild(td);
  };

  const generate = () => {
    clearTable();

    const data = new FormData(form);
    const baseCidr = String(data.get('baseCidr') || '');
    const countRaw = Number(data.get('count'));
    const splitLevel = Number(data.get('splitLevel'));
    const namePrefix = String(data.get('namePrefix') || 'subnet').trim();
    const names = String(data.get('names') || '');

    const parsed = parseCidr(baseCidr);
    if (!parsed) {
      setMessage(message, 'Invalid base CIDR. Example: 10.42.0.0/16', true);
      return;
    }

    const maxSplit = 32 - parsed.prefix;
    const maxPossibleSubnets = 2 ** maxSplit;
    const count = Math.max(1, Number.isInteger(countRaw) ? countRaw : 1);

    if (count > maxPossibleSubnets) {
      setMessage(
        message,
        `Requested ${count} subnet(s), but at most ${maxPossibleSubnets} fit in ${baseCidr}.`,
        true
      );
      return;
    }

    const minRequiredSplit = Math.ceil(Math.log2(count));
    if (slider) {
      slider.max = String(maxSplit);
      slider.min = String(minRequiredSplit);
      if (splitLevel > maxSplit) slider.value = String(maxSplit);
      if (splitLevel < minRequiredSplit)
        slider.value = String(minRequiredSplit);
    }

    const split = Math.min(
      Math.max(Number(slider?.value || splitLevel), minRequiredSplit),
      maxSplit
    );
    const subnetPrefix = parsed.prefix + split;
    const subnetSize = 2 ** (32 - subnetPrefix);
    const maxSubnets = 2 ** split;

    if (splitSummary) {
      splitSummary.textContent = `/${subnetPrefix} · ${subnetSize} IPs/subnet · max ${maxSubnets} subnets`;
    }

    const limitedCount = Math.min(count, maxSubnets);
    const renderedCount = Math.min(limitedCount, MAX_RENDERED_ROWS);
    const countInput = form.elements.namedItem('count');
    if (countInput && 'max' in countInput) {
      countInput.max = String(maxPossibleSubnets);
    }

    const namesList = names
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    if (!tbody || !table) return;

    for (let i = 0; i < renderedCount; i += 1) {
      const network = (parsed.network + i * subnetSize) >>> 0;
      const broadcast = (network + subnetSize - 1) >>> 0;
      const firstUsable = subnetSize > 2 ? (network + 1) >>> 0 : network;
      const lastUsable = subnetSize > 2 ? (broadcast - 1) >>> 0 : broadcast;
      const usableHosts = subnetSize > 2 ? subnetSize - 2 : 0;

      const tr = document.createElement('tr');
      appendCell(
        tr,
        namesList[i] ||
          `${(namePrefix || 'subnet').replace(/\s+/g, '-')}-${i + 1}`
      );
      appendCell(tr, `${intToIp(network)}/${subnetPrefix}`);
      appendCell(tr, intToIp(network));
      appendCell(tr, intToIp(firstUsable));
      appendCell(tr, intToIp(lastUsable));
      appendCell(tr, intToIp(broadcast));
      appendCell(tr, String(usableHosts));
      tbody.appendChild(tr);
    }

    table.hidden = false;
    if (copyButton) copyButton.disabled = renderedCount === 0;
    if (limitedCount > renderedCount) {
      setMessage(
        message,
        `Generated ${limitedCount} subnet(s); showing first ${renderedCount} for readability.`
      );
    } else {
      setMessage(message, `Generated ${limitedCount} subnet(s).`);
    }
  };

  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('input', generate);

  copyButton?.addEventListener('click', async () => {
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (rows.length === 0) {
      setMessage(message, 'Nothing to copy yet.', true);
      return;
    }

    const lines = rows
      .map((row) => {
        const cells = row.querySelectorAll('td');
        const name = cells[0]?.textContent?.trim();
        const cidr = cells[1]?.textContent?.trim();
        return name && cidr ? `${name}: ${cidr}` : null;
      })
      .filter(Boolean)
      .join('\n');

    if (!lines) {
      setMessage(message, 'Nothing to copy yet.', true);
      return;
    }

    try {
      await navigator.clipboard.writeText(lines);
      setMessage(message, `Copied ${rows.length} subnet line(s) to clipboard.`);
    } catch {
      setMessage(message, 'Copy failed. Clipboard access was blocked.', true);
    }
  });

  generate();
};
