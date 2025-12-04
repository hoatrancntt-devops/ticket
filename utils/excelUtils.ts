
import { Ticket } from "../types";

export const exportTicketsToExcel = (tickets: Ticket[], filename: string = 'danh_sach_ticket.xls') => {
  // Tạo nội dung HTML cho bảng Excel
  // Sử dụng mso-number-format:'\@' để ép kiểu text cho cột ID, tránh bị Excel tự động format số
  let tableContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      <!--[if gte mso 9]>
      <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Danh sách yêu cầu</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #4f81bd; color: white; border: 1px solid #ddd; padding: 8px; text-align: left; }
        td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
        .text-cell { mso-number-format:"\@"; } /* Ép kiểu Text cho Excel */
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Người yêu cầu</th>
            <th>Ngày yêu cầu</th>
            <th>Ngày hoàn thành</th>
            <th>Trạng thái</th>
            <th>Công ty</th>
            <th>Người tiếp nhận</th>
            <th>Hạng mục</th>
            <th>Mô tả</th>
            <th>Đính kèm</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Thêm các dòng dữ liệu
  tickets.forEach(ticket => {
    // Format attachments for Excel (list links)
    const attachmentsHtml = ticket.attachments?.map(a => {
      if (a.type === 'link') return `<a href="${a.url}">${a.name}</a>`;
      return `[${a.type}] ${a.name}`;
    }).join('<br>') || '';

    tableContent += `
      <tr>
        <td class="text-cell">${ticket.id}</td>
        <td>${ticket.requester}</td>
        <td class="text-cell">${ticket.requestDate}</td>
        <td class="text-cell">${ticket.completionDate || ''}</td>
        <td>${ticket.status}</td>
        <td>${ticket.company}</td>
        <td>${ticket.assignee}</td>
        <td>${ticket.category}</td>
        <td>${ticket.description || ''}</td>
        <td>${attachmentsHtml}</td>
      </tr>
    `;
  });

  tableContent += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  // Tạo Blob với MIME type của Excel
  const blob = new Blob([tableContent], { type: 'application/vnd.ms-excel' });
  
  // Tạo link tải xuống
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
