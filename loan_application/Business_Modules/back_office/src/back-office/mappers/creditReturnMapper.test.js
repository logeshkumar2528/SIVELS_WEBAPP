import { describe, expect, it } from 'vitest';
import {
  RETURN_ITEM_STATUS,
  getAttentionSections,
  groupReturnItemsByStep,
  itemNeedsAttention,
  mapCreditReturnItem,
} from './creditReturnMapper';
import {
  RETURN_ISSUE_MAX,
  buildCreditReturnItemFromStep,
  getReturnItemStep,
} from '../config/creditReturnFields';

const rawItem = (overrides = {}) => ({
  applicationCreditReturnItemId: 1,
  applicationCreditDecisionId: 10,
  agentCustomerId: 99,
  sectionCode: 'LEGAL_OPINION',
  sectionName: 'Legal Report',
  fieldKey: 'OTHER',
  fieldLabel: 'Legal Report',
  issue: 'Owner name on the legal report does not match the sale deed.',
  itemStatus: 'Open',
  isResolved: false,
  raisedByUserId: 21,
  raisedByRole: 'CreditManager',
  raisedAt: '2026-10-09T10:00:00',
  events: [
    {
      applicationCreditReturnItemEventId: 5,
      eventType: 'Returned',
      toItemStatus: 'Open',
      remarks: 'Owner name mismatch',
      performedByUserId: 21,
      performedByRole: 'CreditManager',
      createdAt: '2026-10-09T10:00:00',
    },
  ],
  ...overrides,
});

describe('mapCreditReturnItem', () => {
  it('maps status, actors and the event history', () => {
    const item = mapCreditReturnItem(rawItem());
    expect(item).toMatchObject({
      id: 1,
      decisionId: 10,
      sectionCode: 'LEGAL_OPINION',
      itemStatus: RETURN_ITEM_STATUS.OPEN,
      isResolved: false,
      raisedByUserId: 21,
      raisedByRole: 'CreditManager',
    });
    expect(item.events).toHaveLength(1);
    expect(item.events[0]).toMatchObject({ eventType: 'Returned', performedByUserId: 21 });
  });

  it('derives the status from the legacy isResolved flag when itemStatus is absent', () => {
    const item = mapCreditReturnItem(rawItem({ itemStatus: undefined, isResolved: true }));
    expect(item.itemStatus).toBe(RETURN_ITEM_STATUS.RESOLVED);
    expect(item.isResolved).toBe(true);
  });

  it('treats every non-Open status as resolved by the Back Office', () => {
    expect(mapCreditReturnItem(rawItem({ itemStatus: 'Resubmitted' })).isResolved).toBe(true);
    expect(mapCreditReturnItem(rawItem({ itemStatus: 'Open' })).isResolved).toBe(false);
  });
});

describe('section to workspace step mapping', () => {
  it('opens Legal Report (step 06) and Asset Base (step 11)', () => {
    expect(getReturnItemStep({ sectionCode: 'LEGAL_OPINION' })).toEqual({ stepId: 11, visibleNum: '06' });
    expect(getReturnItemStep({ sectionCode: 'ASSET_BASE' })).toEqual({ stepId: 20, visibleNum: '11' });
  });

  it('separates the three field investigation steps by label', () => {
    expect(getReturnItemStep({ sectionCode: 'FIELD_INVESTIGATION', fieldLabel: 'Office FI' }).stepId).toBe(9);
    expect(getReturnItemStep({ sectionCode: 'FIELD_INVESTIGATION', fieldLabel: 'Residence FI' }).stepId).toBe(10);
  });

  it('builds Legal Report and Asset Base items from a section reject', () => {
    expect(buildCreditReturnItemFromStep({ stepNum: 11, stepLabel: 'Legal Report', issue: ' wrong ' })).toMatchObject({
      sectionCode: 'LEGAL_OPINION',
      fieldLabel: 'Legal Report',
      issue: 'wrong',
    });
    expect(buildCreditReturnItemFromStep({ stepNum: 20, stepLabel: 'Asset Base', issue: 'x' }).sectionCode).toBe(
      'ASSET_BASE'
    );
  });

  it('caps the issue at the backend limit', () => {
    const item = buildCreditReturnItemFromStep({ stepNum: 11, stepLabel: 'Legal Report', issue: 'a'.repeat(1500) });
    expect(item.issue).toHaveLength(RETURN_ISSUE_MAX);
  });
});

describe('attention per role', () => {
  const items = [
    mapCreditReturnItem(rawItem({ applicationCreditReturnItemId: 1, itemStatus: 'Open' })),
    mapCreditReturnItem(
      rawItem({ applicationCreditReturnItemId: 2, sectionCode: 'ASSET_BASE', sectionName: 'Asset Base', itemStatus: 'Resubmitted' })
    ),
    mapCreditReturnItem(rawItem({ applicationCreditReturnItemId: 3, itemStatus: 'Reopened' })),
  ];

  it('Back Office acts on Open items, Credit Manager on Resubmitted items', () => {
    expect(itemNeedsAttention(items[0], 'BackOffice')).toBe(true);
    expect(itemNeedsAttention(items[1], 'BackOffice')).toBe(false);
    expect(itemNeedsAttention(items[1], 'CreditManager')).toBe(true);
    expect(itemNeedsAttention(items[2], 'CreditManager')).toBe(false);
  });

  it('lists only the sections needing the viewer’s action', () => {
    expect(getAttentionSections(items, 'BackOffice')).toEqual([
      { stepId: 11, visibleNum: '06', sectionName: 'Legal Report', count: 1 },
    ]);
    expect(getAttentionSections(items, 'CreditManager')).toEqual([
      { stepId: 20, visibleNum: '11', sectionName: 'Asset Base', count: 1 },
    ]);
  });

  it('groups items (including history) by workspace step', () => {
    const grouped = groupReturnItemsByStep(items);
    expect(grouped[11]).toHaveLength(2);
    expect(grouped[20]).toHaveLength(1);
  });
});
