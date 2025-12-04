
export type TicketStatus = 'Mới' | 'Đang xử lý' | 'Đã xong' | 'Đóng';
export type TicketCategory = 'Helpdesk' | 'System-Network' | 'Application';

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'link';
  name: string;
  url: string; // Base64 for files, http url for links
}

export interface Ticket {
  id: string;
  requester: string;      // Họ và tên người yêu cầu
  requestDate: string;    // Ngày yêu cầu
  completionDate?: string;// Ngày hoàn thành
  status: TicketStatus;   // Tình trạng
  company: string;        // Công ty
  assignee: string;       // Người tiếp nhận
  category: TicketCategory; // Hạng mục
  description?: string;   // Mô tả chi tiết (optional)
  attachments?: Attachment[]; // Danh sách đính kèm
}

export const TICKET_STATUSES: TicketStatus[] = ['Mới', 'Đang xử lý', 'Đã xong', 'Đóng'];
export const TICKET_CATEGORIES: TicketCategory[] = ['Helpdesk', 'System-Network', 'Application'];

export const COMPANIES = [
  'Công ty Suleco',
  'Công ty Hoàn Lộc Việt',
  'Công ty Mỹ Sơn- Hoàn Lộc Việt',
  'Công ty SCTS',
  'Văn Phòng Công Chứng Châu Á'
];

export const ASSIGNEES = [
  'Võ Thành Phúc - phucvt@scts.com.vn',
  'Trần Văn Hòa - hoatv@scts.com.vn',
  'Thái Thanh Khang- khangtt@scts.com.vn',
  'Nguyễn Duy Nam- namnd@scts.com.vn'
];

// === TTS / Voice App Types (Preserved but unused in Ticket App) ===

export interface SRTSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface Voice {
  id: VoiceName;
  name: string;
  gender: 'Male' | 'Female';
  description: string;
}

export const AVAILABLE_VOICES: Voice[] = [
  { 
    id: 'Puck', 
    name: 'Puck', 
    gender: 'Male', 
    description: 'Giọng nam trầm, ổn định' 
  },
  { 
    id: 'Charon', 
    name: 'Charon', 
    gender: 'Male', 
    description: 'Giọng nam sâu lắng' 
  },
  { 
    id: 'Kore', 
    name: 'Kore', 
    gender: 'Female', 
    description: 'Giọng nữ nhẹ nhàng' 
  },
  { 
    id: 'Fenrir', 
    name: 'Fenrir', 
    gender: 'Male', 
    description: 'Giọng nam mạnh mẽ' 
  },
  { 
    id: 'Zephyr', 
    name: 'Zephyr', 
    gender: 'Female', 
    description: 'Giọng nữ trong trẻo' 
  },
];
