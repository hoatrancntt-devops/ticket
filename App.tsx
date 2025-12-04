
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Ticket, TicketStatus, TicketCategory, TICKET_STATUSES, TICKET_CATEGORIES, COMPANIES, ASSIGNEES, Attachment } from './types';
import { exportTicketsToExcel } from './utils/excelUtils';

// Helper: Get local date string YYYY-MM-DD
const getTodayString = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: Calculate Completion Date = Request Date + 3 days (Skip Sunday)
const calculateCompletionDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return '';
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed month
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  
  // Rule: Add 3 days
  date.setDate(date.getDate() + 3);
  
  // Rule: If Sunday (0), add 1 more day
  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }
  
  // Format back to YYYY-MM-DD
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  
  return `${y}-${m}-${d}`;
};

const today = getTodayString();

// Initial empty state for form
const INITIAL_FORM: Omit<Ticket, 'id'> = {
  requester: '',
  requestDate: today,
  completionDate: calculateCompletionDate(today),
  status: 'Mới',
  company: COMPANIES[0], // Default to first company
  assignee: ASSIGNEES[0], // Default to first assignee
  category: 'Helpdesk',
  description: '',
  attachments: []
};

const App: React.FC = () => {
  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // App State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [formData, setFormData] = useState<Omit<Ticket, 'id'>>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Attachment input State
  const [linkInput, setLinkInput] = useState('');
  
  // Ref for file input (Restore Data)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter State
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Check login session
  useEffect(() => {
    const session = localStorage.getItem('isLoggedIn');
    if (session === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  // Load tickets
  useEffect(() => {
    const savedTickets = localStorage.getItem('tickets');
    if (savedTickets) {
      try {
        setTickets(JSON.parse(savedTickets));
      } catch (e) {
        console.error("Failed to load tickets", e);
      }
    }
  }, []);

  // Save tickets
  useEffect(() => {
    localStorage.setItem('tickets', JSON.stringify(tickets));
  }, [tickets]);

  // --- FILTER LOGIC ---
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Filter by Date Range (Request Date)
      if (filterStartDate && ticket.requestDate < filterStartDate) return false;
      if (filterEndDate && ticket.requestDate > filterEndDate) return false;

      // Filter by Company
      if (filterCompany && ticket.company !== filterCompany) return false;

      // Filter by Assignee
      if (filterAssignee && ticket.assignee !== filterAssignee) return false;

      // Filter by Status
      if (filterStatus && ticket.status !== filterStatus) return false;

      return true;
    });
  }, [tickets, filterStartDate, filterEndDate, filterCompany, filterAssignee, filterStatus]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'nimda' && password === '123') {
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
      setLoginError('');
    } else {
      setLoginError('Tên đăng nhập hoặc mật khẩu không đúng');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    setUsername('');
    setPassword('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updatedData = { ...prev, [name]: value };
      
      // Auto-calculate completion date when requestDate changes
      if (name === 'requestDate') {
        updatedData.completionDate = calculateCompletionDate(value);
      }
      
      return updatedData;
    });
  };

  // --- ATTACHMENT LOGIC ---
  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    const newAttachment: Attachment = {
      id: Date.now().toString(),
      type: 'link',
      name: linkInput,
      url: linkInput.startsWith('http') ? linkInput : `https://${linkInput}`
    };
    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAttachment]
    }));
    setLinkInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 2MB for LocalStorage demo
    if (file.size > 2 * 1024 * 1024) {
      alert("Để đảm bảo hiệu năng trình duyệt, vui lòng chọn file nhỏ hơn 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const type = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'link');
      
      const newAttachment: Attachment = {
        id: Date.now().toString(),
        type: type as any, // Simple casting for demo
        name: file.name,
        url: base64
      };

      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), newAttachment]
      }));
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter(a => a.id !== id)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // Update existing ticket
      setTickets(prev => prev.map(t => t.id === editingId ? { ...formData, id: editingId } : t));
      setEditingId(null);
    } else {
      // Create new ticket
      const newTicket: Ticket = {
        ...formData,
        id: Date.now().toString(),
      };
      setTickets(prev => [newTicket, ...prev]);
    }
    
    // Reset form
    setFormData(INITIAL_FORM);
    setShowForm(false);
  };

  const handleEdit = (ticket: Ticket) => {
    setFormData(ticket);
    setEditingId(ticket.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa yêu cầu này?')) {
      setTickets(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleCancel = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleResetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterCompany('');
    setFilterAssignee('');
    setFilterStatus('');
  };

  const handleDownloadExcel = () => {
    let filenameParts = ['Bao_cao'];
    if (filterStartDate) filenameParts.push(`tu_${filterStartDate}`);
    if (filterEndDate) filenameParts.push(`den_${filterEndDate}`);
    if (filterStatus) filenameParts.push(filterStatus);
    if (filenameParts.length === 1) filenameParts.push(getTodayString());

    const filename = filenameParts.join('_') + '.xls';
    exportTicketsToExcel(filteredTickets, filename);
  };

  // --- DATA BACKUP & RESTORE LOGIC ---
  const handleBackupData = () => {
    const dataStr = JSON.stringify(tickets, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_data_ticket_${getTodayString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsedData = JSON.parse(json);
        if (Array.isArray(parsedData)) {
          if(window.confirm(`Tìm thấy ${parsedData.length} ticket trong file. Bạn có muốn thay thế dữ liệu hiện tại không?`)) {
             setTickets(parsedData);
             alert("Khôi phục dữ liệu thành công!");
          }
        } else {
          alert("File không hợp lệ.");
        }
      } catch (err) {
        alert("Lỗi khi đọc file backup.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset value
    e.target.value = '';
  };

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 relative">
        <div className="max-w-md w-full bg-white border border-gray-300 shadow-xl rounded-2xl p-8 z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">Đăng Nhập</h1>
            <p className="text-gray-600">Hệ thống quản lý Ticket</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Tài khoản</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none transition-colors text-green-600 font-semibold" 
                placeholder="Nhập tài khoản" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Mật khẩu</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none transition-colors text-green-600 font-semibold" 
                placeholder="Nhập mật khẩu" 
                required 
              />
            </div>
            {loginError && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">{loginError}</div>}
            <button type="submit" className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors shadow-lg">Đăng nhập</button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
             <p className="text-sm text-gray-500 italic">
               Viết bởi AI và tư vấn của chuyên gia: <span className="font-bold text-blue-700 not-italic">Trần Văn Hòa</span>
             </p>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-white text-black pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="bg-black p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
             </div>
             <div>
               <h1 className="text-2xl font-bold text-black tracking-tight">Quản Lý Ticket</h1>
               <p className="text-xs text-gray-500">Phiên bản IIS v1.1</p>
             </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto justify-end">
             {/* Data Management Buttons */}
             <div className="flex gap-2 mr-2 border-r border-gray-300 pr-2">
                <button onClick={handleBackupData} className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 rounded hover:bg-gray-200" title="Tải dữ liệu về máy">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Sao lưu
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 rounded hover:bg-gray-200" title="Tải dữ liệu lên">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                   Khôi phục
                </button>
                <input type="file" ref={fileInputRef} onChange={handleRestoreData} className="hidden" accept=".json" />
             </div>

             <button onClick={handleDownloadExcel} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-green-700 bg-white border-2 border-green-600 rounded-lg hover:bg-green-50 transition-colors whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Xuất Báo Cáo
             </button>
             <button onClick={() => setShowForm(true)} disabled={showForm} className="px-6 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
               + Tạo Mới
             </button>
             <button onClick={handleLogout} className="ml-2 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors whitespace-nowrap">Thoát</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Filter Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Bộ lọc & Tìm kiếm
            </h3>
            {(filterStartDate || filterEndDate || filterCompany || filterAssignee || filterStatus) && (
              <button onClick={handleResetFilters} className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline">Xóa bộ lọc</button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
              <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-black focus:ring-0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
              <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-black focus:ring-0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Công ty</label>
              <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-black focus:ring-0 bg-white">
                <option value="">Tất cả công ty</option>
                {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Người tiếp nhận</label>
              <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-black focus:ring-0 bg-white">
                <option value="">Tất cả nhân viên</option>
                {ASSIGNEES.map(a => <option key={a} value={a}>{a.split('-')[0]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-black focus:ring-0 bg-white">
                <option value="">Tất cả trạng thái</option>
                {TICKET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Form Section */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-black">{editingId ? 'Cập Nhật Yêu Cầu' : 'Tạo Yêu Cầu Mới'}</h2>
              <button onClick={handleCancel} className="text-gray-400 hover:text-black">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Họ và tên người yêu cầu <span className="text-red-500">*</span></label>
                <input type="text" name="requester" required value={formData.requester} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 border-2 p-3 text-black focus:border-black focus:ring-0 outline-none" placeholder="Nhập tên người yêu cầu" />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Công ty <span className="text-red-500">*</span></label>
                <select name="company" required value={formData.company} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 border-2 p-3 text-black focus:border-black focus:ring-0 outline-none bg-white">
                  <option value="" disabled>Chọn công ty</option>
                  {COMPANIES.map((company) => (<option key={company} value={company}>{company}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Ngày yêu cầu</label>
                <input type="date" name="requestDate" required value={formData.requestDate} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 border-2 p-3 text-black focus:border-black focus:ring-0 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Ngày hoàn thành (Dự kiến)</label>
                <input type="date" name="completionDate" value={formData.completionDate} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 border-2 p-3 text-black focus:border-black focus:ring-0 outline-none" />
                <p className="text-xs text-gray-400 mt-1 italic">* Tự động: Ngày yêu cầu + 3 ngày (Tránh CN)</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Hạng mục công việc</label>
                <select name="category" value={formData.category} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 border-2 p-3 text-black focus:border-black focus:ring-0 outline-none bg-white">
                  {TICKET_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Tình trạng yêu cầu</label>
                <select name="status" value={formData.status} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 border-2 p-3 text-black focus:border-black focus:ring-0 outline-none bg-white">
                  {TICKET_STATUSES.map(stat => (<option key={stat} value={stat}>{stat}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-black mb-2">Người tiếp nhận <span className="text-red-500">*</span></label>
                <select name="assignee" required value={formData.assignee} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 border-2 p-3 text-black focus:border-black focus:ring-0 outline-none bg-white">
                  <option value="" disabled>Chọn người tiếp nhận</option>
                  {ASSIGNEES.map((assignee) => (<option key={assignee} value={assignee}>{assignee}</option>))}
                </select>
              </div>
               <div className="md:col-span-2">
                <label className="block text-sm font-bold text-black mb-2">Mô tả chi tiết</label>
                <textarea name="description" rows={4} value={formData.description} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 border-2 p-3 text-black focus:border-black focus:ring-0 outline-none" placeholder="Nhập chi tiết yêu cầu..." />
              </div>

              {/* Attachments Section */}
              <div className="md:col-span-2 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
                 <h4 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg>
                    Đính kèm (Ảnh, Video, Link)
                 </h4>
                 
                 <div className="flex gap-4 mb-4 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                       <label className="block text-xs font-medium text-gray-500 mb-1">Thêm Link</label>
                       <div className="flex gap-2">
                         <input type="text" value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="https://..." className="flex-1 p-2 text-sm border border-gray-300 rounded focus:border-black focus:ring-0" />
                         <button type="button" onClick={handleAddLink} className="bg-gray-200 hover:bg-gray-300 text-black px-3 py-2 rounded text-sm font-medium">Thêm</button>
                       </div>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                       <label className="block text-xs font-medium text-gray-500 mb-1">Upload File (Max 2MB)</label>
                       <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"/>
                    </div>
                 </div>

                 {/* Attachment List */}
                 {formData.attachments && formData.attachments.length > 0 && (
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {formData.attachments.map((att, idx) => (
                        <div key={att.id} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-white">
                           <button type="button" onClick={() => removeAttachment(att.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                           </button>
                           {att.type === 'image' && (
                             <img src={att.url} alt={att.name} className="w-full h-24 object-cover" />
                           )}
                           {att.type === 'video' && (
                             <video src={att.url} className="w-full h-24 object-cover bg-black" />
                           )}
                           {att.type === 'link' && (
                             <div className="w-full h-24 flex items-center justify-center bg-blue-50 text-blue-500 flex-col p-2 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                <span className="text-xs truncate w-full">{att.name}</span>
                             </div>
                           )}
                           <div className="p-2 text-xs truncate bg-gray-50">{att.name}</div>
                        </div>
                      ))}
                   </div>
                 )}
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={handleCancel} className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">Hủy bỏ</button>
                <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-black border-2 border-black rounded-lg hover:bg-gray-800 transition-colors shadow-md">{editingId ? 'Cập Nhật' : 'Lưu Lại'}</button>
              </div>
            </form>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-white uppercase bg-black">
                <tr>
                  <th className="px-6 py-4 font-bold">Người yêu cầu / Công ty</th>
                  <th className="px-6 py-4 font-bold">Hạng mục</th>
                  <th className="px-6 py-4 font-bold">Tiếp nhận</th>
                  <th className="px-6 py-4 font-bold">Ngày yêu cầu / Xong</th>
                  <th className="px-6 py-4 font-bold">Trạng thái</th>
                  <th className="px-6 py-4 font-bold">Đính kèm</th>
                  <th className="px-6 py-4 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTickets.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">{tickets.length === 0 ? "Chưa có dữ liệu. Hãy tạo ticket mới hoặc khôi phục dữ liệu." : "Không tìm thấy kết quả phù hợp với bộ lọc."}</td></tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="bg-white hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-black text-base">{ticket.requester}</div>
                        <div className="text-sm text-gray-600 mt-1">{ticket.company}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${ticket.category === 'Helpdesk' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''} ${ticket.category === 'System-Network' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : ''} ${ticket.category === 'Application' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}`}>
                          {ticket.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-medium whitespace-pre-line">{ticket.assignee.split('-')[0]}</td>
                      <td className="px-6 py-4 text-gray-700">
                        <div>{ticket.requestDate}</div>
                        {ticket.completionDate && (<div className="text-xs font-semibold text-green-700 mt-1">Xong: {ticket.completionDate}</div>)}
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-3 py-1 rounded text-xs font-bold border ${ticket.status === 'Mới' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''} ${ticket.status === 'Đang xử lý' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''} ${ticket.status === 'Đã xong' ? 'bg-green-50 text-green-700 border-green-200' : ''} ${ticket.status === 'Đóng' ? 'bg-gray-100 text-gray-600 border-gray-200' : ''}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {ticket.attachments && ticket.attachments.length > 0 ? (
                           <div className="flex -space-x-2 overflow-hidden">
                              {ticket.attachments.map((att, idx) => (
                                 <div key={idx} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600" title={att.name}>
                                    {att.type === 'image' ? 'IMG' : (att.type === 'video' ? 'VID' : 'LNK')}
                                 </div>
                              ))}
                              {ticket.attachments.length > 3 && (
                                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                   +{ticket.attachments.length - 3}
                                </div>
                              )}
                           </div>
                        ) : <span className="text-gray-400 text-xs italic">Không</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(ticket)} className="p-2 hover:bg-black hover:text-white text-black border border-gray-300 rounded transition-all" title="Sửa">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(ticket.id)} className="p-2 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 rounded transition-all" title="Xóa">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
