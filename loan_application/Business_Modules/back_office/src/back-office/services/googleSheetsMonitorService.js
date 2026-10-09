/**
 * SIVELS FINANCE — GOOGLE SHEETS AUTOMATIC CHANGE DETECTION SERVICE
 *
 * Frontend-only integration for monitoring the Google Sheets Normal Income worksheet in real-time.
 * - Target worksheet restricted to: 'Eligibility- Normal Income'
 * - Preloaded Google Identity Services (GIS) OAuth 2.0 Token Client
 * - Synchronous user-initiated token requests (zero async delay / popup blocker avoidance)
 * - Single-worksheet discovery with exact bounded grid dimensions
 * - Batched value retrieval for target worksheet (valueRenderOption=FORMATTED_VALUE)
 * - Strict coordinate diffing (zero .trim())
 * - In-memory only OAuth token management (no localStorage/sessionStorage/cookies)
 * - Visibility reconciliation on tab switch
 */

export const TARGET_WORKSHEET_NAME = 'Eligibility- Normal Income';

let inMemoryAccessToken = null;
let tokenExpiresAt = 0;
let tokenClientInstance = null;
let gisLoadingPromise = null;

/**
 * Converts a 0-indexed column integer to standard Excel/Sheets column letters (0 -> A, 25 -> Z, 26 -> AA).
 * @param {number} colIndex
 * @returns {string}
 */
export function getColumnLetter(colIndex) {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Constructs safely bounded A1 range using worksheet title and grid dimensions.
 * Handles sheet titles containing spaces, hyphens, and single quotes.
 * @param {string} title
 * @param {number} rowCount
 * @param {number} columnCount
 * @returns {string}
 */
export function formatSheetRange(title, rowCount, columnCount) {
  const escapedTitle = title.replace(/'/g, "''");
  const maxCol = columnCount && columnCount > 0 ? getColumnLetter(columnCount - 1) : 'Z';
  const maxRow = rowCount && rowCount > 0 ? rowCount : 500;
  return `'${escapedTitle}'!A1:${maxCol}${maxRow}`;
}

/**
 * Dynamically loads / ensures the Google Identity Services SDK is ready.
 * @returns {Promise<any>}
 */
export function loadGisScript() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve(window.google.accounts.oauth2);
  }
  if (gisLoadingPromise) return gisLoadingPromise;

  gisLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google?.accounts?.oauth2));
      existing.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve(window.google.accounts.oauth2);
      } else {
        reject(new Error('Google Identity Services SDK failed to initialize'));
      }
    };
    script.onerror = () => {
      gisLoadingPromise = null;
      reject(new Error('Failed to load Google Identity Services SDK'));
    };
    document.head.appendChild(script);
  });
  return gisLoadingPromise;
}

/**
 * Checks whether a valid, non-expired Google OAuth access token is active in memory.
 * @returns {boolean}
 */
export function isGoogleOAuthAuthorized() {
  return Boolean(inMemoryAccessToken && Date.now() < tokenExpiresAt - 60000);
}

/**
 * Pre-initializes the Google Identity Services OAuth Token Client.
 * Should be called on component mount so tokenClient is ready for synchronous user click activation.
 * @param {string} clientId
 * @param {Function} [onTokenSuccess]
 * @param {Function} [onTokenError]
 * @returns {any}
 */
export function initGoogleOAuthClient(clientId, onTokenSuccess, onTokenError) {
  if (!clientId) return null;

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    // If GIS script is still loading, attach onload handler
    loadGisScript().then((api) => {
      if (api && !tokenClientInstance) {
        initGoogleOAuthClient(clientId, onTokenSuccess, onTokenError);
      }
    }).catch(() => {});
    return null;
  }

  try {
    tokenClientInstance = oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      callback: (response) => {
        if (response?.error) {
          console.warn('[Normal Income] Google OAuth Authorization Error:', response.error, response.error_description || '');
          if (onTokenError) onTokenError(new Error(response.error_description || response.error));
          return;
        }
        if (response?.access_token) {
          inMemoryAccessToken = response.access_token;
          const expiresInSec = Number(response.expires_in) || 3599;
          tokenExpiresAt = Date.now() + expiresInSec * 1000;
          console.log('[Normal Income] Google OAuth token acquired successfully.');
          if (onTokenSuccess) onTokenSuccess(inMemoryAccessToken);
        } else {
          if (onTokenError) onTokenError(new Error('No access token returned from Google Identity Services'));
        }
      },
      error_callback: (err) => {
        console.warn('[Normal Income] Google OAuth Client Error:', err);
        if (onTokenError) onTokenError(err);
      }
    });
    return tokenClientInstance;
  } catch (err) {
    console.warn('[Normal Income] Failed to initialize Google OAuth token client:', err);
    return null;
  }
}

/**
 * Initiates user-directed OAuth authorization synchronously within a click event.
 * Avoids asynchronous delays to preserve the browser's transient user activation state.
 * @param {string} clientId
 * @param {{ onAuthorized?: (token: string) => void, onError?: (err: any) => void }} callbacks
 * @returns {boolean}
 */
export function triggerGoogleOAuth(clientId, { onAuthorized, onError } = {}) {
  if (!clientId) {
    console.warn('[Normal Income] VITE_GOOGLE_SHEETS_CLIENT_ID is not configured. Google Sheets monitoring cannot start.');
    if (onError) onError(new Error('Missing Client ID'));
    return false;
  }

  // If already authorized with a valid in-memory token, invoke callback immediately
  if (isGoogleOAuthAuthorized()) {
    if (onAuthorized) onAuthorized(inMemoryAccessToken);
    return true;
  }

  // Ensure token client is instantiated
  if (!tokenClientInstance && window.google?.accounts?.oauth2) {
    initGoogleOAuthClient(clientId, onAuthorized, onError);
  }

  if (!tokenClientInstance) {
    console.warn('[Normal Income] Google Identity Services SDK is not ready yet. Retrying initialization...');
    loadGisScript().then((api) => {
      if (api) {
        initGoogleOAuthClient(clientId, onAuthorized, onError);
      }
    });
    if (onError) onError(new Error('GIS not loaded'));
    return false;
  }

  // Update dynamic callbacks for this specific authorization gesture
  tokenClientInstance.callback = (response) => {
    if (response?.error) {
      console.warn('[Normal Income] Google OAuth Authorization Error:', response.error, response.error_description || '');
      if (onError) onError(new Error(response.error_description || response.error));
      return;
    }
    if (response?.access_token) {
      inMemoryAccessToken = response.access_token;
      const expiresInSec = Number(response.expires_in) || 3599;
      tokenExpiresAt = Date.now() + expiresInSec * 1000;
      console.log('[Normal Income] Google OAuth token acquired successfully.');
      if (onAuthorized) onAuthorized(inMemoryAccessToken);
    } else {
      if (onError) onError(new Error('No access token returned from Google Identity Services'));
    }
  };

  tokenClientInstance.error_callback = (err) => {
    console.warn('[Normal Income] Google OAuth Client Error:', err);
    if (onError) onError(err);
  };

  // Synchronous invocation inside user click event
  tokenClientInstance.requestAccessToken({ prompt: '' });
  return true;
}

/**
 * Retrieves spreadsheet metadata and bounded grid dimensions for the target worksheet alone.
 * @param {string} spreadsheetId
 * @param {string} token
 * @param {AbortSignal} [signal]
 * @param {string} [targetSheetName]
 * @returns {Promise<Array<{ title: string, sheetId: number, rowCount: number, columnCount: number, boundedRange: string }>>}
 */
export async function fetchSpreadsheetMetadata(
  spreadsheetId,
  token,
  signal,
  targetSheetName = TARGET_WORKSHEET_NAME
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId,gridProperties(rowCount,columnCount))`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal
  });

  if (res.status === 401) {
    inMemoryAccessToken = null;
    tokenExpiresAt = 0;
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    throw new Error(`METADATA_FETCH_ERROR_${res.status}`);
  }

  const data = await res.json();
  const sheets = Array.isArray(data?.sheets) ? data.sheets : [];

  // Match target worksheet title exactly, with space-normalized fallback
  let matchedSheet = sheets.find((s) => s.properties?.title === targetSheetName);
  if (!matchedSheet && targetSheetName) {
    const normalizedTarget = targetSheetName.trim().toLowerCase().replace(/\s+/g, ' ');
    matchedSheet = sheets.find(
      (s) => (s.properties?.title || '').trim().toLowerCase().replace(/\s+/g, ' ') === normalizedTarget
    );
  }

  if (!matchedSheet) {
    const availableTitles = sheets.map((s) => s.properties?.title);
    console.warn(
      `[Normal Income] Target worksheet "${targetSheetName}" not found in workbook. Available worksheets:`,
      availableTitles
    );
    return [];
  }

  const props = matchedSheet.properties || {};
  const title = props.title || targetSheetName;
  const rowCount = props.gridProperties?.rowCount || 200;
  const columnCount = props.gridProperties?.columnCount || 26;
  const boundedRange = formatSheetRange(title, rowCount, columnCount);

  return [
    {
      title,
      sheetId: props.sheetId,
      rowCount,
      columnCount,
      boundedRange
    }
  ];
}

/**
 * Retrieves formatted values across the specified worksheet ranges in a single batch request.
 * @param {string} spreadsheetId
 * @param {string[]} ranges
 * @param {string} token
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<{ range: string, values: string[][] }>>}
 */
export async function fetchSpreadsheetValuesBatch(spreadsheetId, ranges, token, signal) {
  if (!ranges || ranges.length === 0) return [];
  const params = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params}&valueRenderOption=FORMATTED_VALUE`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal
  });

  if (res.status === 401) {
    inMemoryAccessToken = null;
    tokenExpiresAt = 0;
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    throw new Error(`VALUES_FETCH_ERROR_${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data?.valueRanges) ? data.valueRanges : [];
}

/**
 * Compares two spreadsheet snapshots for the target worksheet and logs cell changes.
 * Strictly avoids .trim() to detect exact whitespace modifications.
 * @param {{ sheets: Record<string, string[][]> }} oldSnapshot
 * @param {{ sheets: Record<string, string[][]> }} newSnapshot
 * @returns {Array<{ sheetName: string, cell: string, oldValue: string, newValue: string, detectedAt: string }>}
 */
export function diffSpreadsheetSnapshots(oldSnapshot, newSnapshot) {
  const changes = [];
  const targetTitles = Object.keys(newSnapshot?.sheets || {});

  for (const title of targetTitles) {
    const oldGrid = oldSnapshot?.sheets?.[title] || [];
    const newGrid = newSnapshot?.sheets?.[title] || [];

    const maxRows = Math.max(oldGrid.length, newGrid.length);
    for (let r = 0; r < maxRows; r++) {
      const oldRow = oldGrid[r] || [];
      const newRow = newGrid[r] || [];
      const maxCols = Math.max(oldRow.length, newRow.length);

      for (let c = 0; c < maxCols; c++) {
        const oldCell = oldRow[c] != null ? String(oldRow[c]) : '';
        const newCell = newRow[c] != null ? String(newRow[c]) : '';

        if (oldCell !== newCell) {
          const cellCoord = `${getColumnLetter(c)}${r + 1}`;
          const updateEvent = {
            sheetName: title,
            cell: cellCoord,
            oldValue: oldCell,
            newValue: newCell,
            detectedAt: new Date().toISOString()
          };
          changes.push(updateEvent);

          console.log('[Normal Income] Google Sheet Cell Updated', updateEvent);
        }
      }
    }
  }

  return changes;
}

/**
 * Active monitoring session restricted exclusively to the target worksheet ('Eligibility- Normal Income').
 * Handles background polling, visibility reconciliation, and safe teardown.
 */
export class GoogleSheetsMonitor {
  constructor({
    spreadsheetId,
    clientId,
    targetSheetName = TARGET_WORKSHEET_NAME,
    pollIntervalMs = 3000,
    metadataRefreshCycles = 5
  }) {
    this.spreadsheetId = spreadsheetId;
    this.clientId = clientId;
    this.targetSheetName = targetSheetName;
    this.pollIntervalMs = pollIntervalMs;
    this.metadataRefreshCycles = metadataRefreshCycles;

    this.isRunning = false;
    this.isFetchInFlight = false;
    this.cycleCount = 0;
    this.timerId = null;
    this.abortController = null;
    this.cachedMetadata = [];
    this.lastSnapshot = null;

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  async start() {
    if (this.isRunning) return;

    if (!isGoogleOAuthAuthorized()) {
      console.warn('[Normal Income] Cannot start Google Sheets monitor: OAuth authorization not completed.');
      return;
    }

    this.isRunning = true;
    console.log(
      `[Normal Income] Starting Google Sheets monitor for worksheet "${this.targetSheetName}" (Workbook: ${this.spreadsheetId})...`
    );

    try {
      // Initial baseline snapshot for the target worksheet alone
      await this.refreshMetadataAndValues(true);

      // Listen for tab focus reconciliation
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      // Start continuous interval loop
      this.timerId = setInterval(() => {
        this.pollTick();
      }, this.pollIntervalMs);
    } catch (err) {
      console.warn('[Normal Income] Failed to establish baseline for Google Sheets monitor:', err.message || err);
      this.stop();
    }
  }

  async pollTick() {
    if (!this.isRunning || this.isFetchInFlight) return;

    this.cycleCount += 1;
    const shouldRefreshMetadata = this.cycleCount % this.metadataRefreshCycles === 0;

    await this.refreshMetadataAndValues(false, shouldRefreshMetadata);
  }

  async handleVisibilityChange() {
    if (document.visibilityState === 'visible' && this.isRunning && !this.isFetchInFlight) {
      // Immediate reconciliation when user returns to Back Office tab
      await this.pollTick();
    }
  }

  async refreshMetadataAndValues(isInitial = false, refreshMetadata = false) {
    if (this.isFetchInFlight) return;
    this.isFetchInFlight = true;

    this.abortController = new AbortController();
    const token = inMemoryAccessToken;

    if (!token) {
      console.warn('[Normal Income] No active OAuth token available. Pausing monitor.');
      this.stop();
      this.isFetchInFlight = false;
      return;
    }

    try {
      // Fetch metadata strictly for target worksheet
      if (isInitial || refreshMetadata || this.cachedMetadata.length === 0) {
        this.cachedMetadata = await fetchSpreadsheetMetadata(
          this.spreadsheetId,
          token,
          this.abortController.signal,
          this.targetSheetName
        );
      }

      if (this.cachedMetadata.length === 0) {
        this.isFetchInFlight = false;
        return;
      }

      const ranges = this.cachedMetadata.map((m) => m.boundedRange);
      const valueRanges = await fetchSpreadsheetValuesBatch(
        this.spreadsheetId,
        ranges,
        token,
        this.abortController.signal
      );

      // Construct structured snapshot map: { [targetSheetTitle]: 2D_Array }
      const newSnapshotSheets = {};
      for (let i = 0; i < this.cachedMetadata.length; i++) {
        const meta = this.cachedMetadata[i];
        const vr = valueRanges[i];
        newSnapshotSheets[meta.title] = Array.isArray(vr?.values) ? vr.values : [];
      }

      const newSnapshot = { sheets: newSnapshotSheets };

      if (!isInitial && this.lastSnapshot) {
        diffSpreadsheetSnapshots(this.lastSnapshot, newSnapshot);
      } else if (isInitial) {
        const targetTitle = this.cachedMetadata[0]?.title || this.targetSheetName;
        console.log(`[Normal Income] Initial baseline snapshot established for worksheet: "${targetTitle}"`);
      }

      this.lastSnapshot = newSnapshot;
    } catch (err) {
      if (err.name === 'AbortError') return;

      if (err.message === 'UNAUTHORIZED') {
        console.warn('[Normal Income] Google Sheets OAuth token expired. Please click Normal Income to re-authenticate.');
        this.stop();
      } else {
        console.warn('[Normal Income] Monitor polling tick error:', err.message || err);
      }
    } finally {
      this.isFetchInFlight = false;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    console.log('[Normal Income] Google Sheets monitor stopped.');
  }
}

// Global active monitor reference for Back Office lifecycle management
let activeMonitorInstance = null;

/**
 * Starts Google Sheets change monitoring strictly for the Normal Income worksheet ('Eligibility- Normal Income').
 * @param {string} spreadsheetId
 * @param {string} clientId
 * @param {string} [targetSheetName]
 * @returns {GoogleSheetsMonitor}
 */
export function startNormalIncomeSheetMonitor(
  spreadsheetId,
  clientId,
  targetSheetName = TARGET_WORKSHEET_NAME
) {
  if (activeMonitorInstance) {
    activeMonitorInstance.stop();
  }

  activeMonitorInstance = new GoogleSheetsMonitor({ spreadsheetId, clientId, targetSheetName });
  activeMonitorInstance.start();
  return activeMonitorInstance;
}

/**
 * Stops any currently active Google Sheets monitor.
 */
export function stopNormalIncomeSheetMonitor() {
  if (activeMonitorInstance) {
    activeMonitorInstance.stop();
    activeMonitorInstance = null;
  }
}
