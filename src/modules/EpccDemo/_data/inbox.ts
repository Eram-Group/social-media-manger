import { TPlatformId } from './platforms';

export type TConvType = 'comment' | 'dm' | 'mention';
export interface IInboxMsg { from: 'them' | 'us'; text: string; time: string }
export interface IConversation {
  id: string;
  platform: TPlatformId;
  name: string;
  handle: string;
  type: TConvType;
  time: string;
  unread: boolean;
  assignee: string;
  messages: IInboxMsg[];
}

export const TEAM = ['Unassigned', 'Sara Al-Otaibi', 'Omar Al-Shehri', 'Noura Al-Harbi'];
export const SAVED_REPLIES = [
  'Thanks for reaching out! 🙏',
  'You can register here: chamber.co/forum-2026',
  'A team member will follow up with you shortly.',
  'Great question — our membership team can help: +966 13 000 0000.',
];

export const CONVERSATIONS: IConversation[] = [
  {
    id: 'c1', platform: 'instagram', name: 'Khalid Al-Dossari', handle: '@khalid.d', type: 'comment',
    time: '4m', unread: true, assignee: 'Unassigned',
    messages: [{ from: 'them', text: 'How can our SME register as an exhibitor for the forum?', time: '4m' }],
  },
  {
    id: 'c2', platform: 'x', name: 'Noura Al-Harbi', handle: '@noura_h', type: 'mention',
    time: '22m', unread: true, assignee: 'Unassigned',
    messages: [{ from: 'them', text: 'Loved the @EP_Chamber session today on Vision 2030 👏 when is the next one?', time: '22m' }],
  },
  {
    id: 'c3', platform: 'linkedin', name: 'Faisal Qahtani', handle: 'Faisal Q.', type: 'dm',
    time: '1h', unread: false, assignee: 'Sara Al-Otaibi',
    messages: [
      { from: 'them', text: 'Hello, we are interested in partnering for the Logistics summit.', time: '1h' },
      { from: 'us', text: 'Wonderful — I\'ll connect you with our events team today.', time: '58m' },
    ],
  },
  {
    id: 'c4', platform: 'facebook', name: 'Mona Al-Shamri', handle: 'Mona A.', type: 'comment',
    time: '2h', unread: false, assignee: 'Omar Al-Shehri',
    messages: [{ from: 'them', text: 'Is the women-in-business session open to non-members?', time: '2h' }],
  },
  {
    id: 'c5', platform: 'tiktok', name: 'Yousef', handle: '@yousef.k', type: 'comment',
    time: '3h', unread: true, assignee: 'Unassigned',
    messages: [{ from: 'them', text: 'This reel is 🔥 more behind-the-scenes please!', time: '3h' }],
  },
  {
    id: 'c6', platform: 'instagram', name: 'Reem Al-Otaibi', handle: '@reem', type: 'dm',
    time: '5h', unread: false, assignee: 'Noura Al-Harbi',
    messages: [{ from: 'them', text: 'Could you share the deck from the investment webinar?', time: '5h' }],
  },
];
