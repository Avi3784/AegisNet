import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generateCSuiteReport = async (threats = [], endpoints = []) => {
  const reportDiv = document.createElement('div');
  reportDiv.style.width = '800px';
  reportDiv.style.padding = '40px';
  reportDiv.style.backgroundColor = '#ffffff';
  reportDiv.style.color = '#000000';
  reportDiv.style.fontFamily = 'Arial, sans-serif';
  reportDiv.style.position = 'absolute';
  reportDiv.style.left = '-9999px';
  reportDiv.style.top = '-9999px';

  const isolatedEndpoints = endpoints.filter(e => e.status === 'ISOLATED' || e.status === 'Isolated');
  
  const osintAlerts = threats
    .filter(t => t.attack_type === 'OSINT' || t.attack_type === 'APT')
    .slice(0, 5);

  reportDiv.innerHTML = `
    <h1 style="color: #1a365d; border-bottom: 2px solid #2b6cb0; padding-bottom: 10px; margin-bottom: 20px;">
      AegisNet C-Suite Incident Report
    </h1>
    
    <div style="margin-bottom: 30px;">
      <h2 style="color: #2d3748; font-size: 18px;">Executive Summary</h2>
      <p style="font-size: 14px;">Total Threats Caught: <strong>${threats.length}</strong></p>
      <p style="font-size: 14px;">Total Endpoints Isolated: <strong>${isolatedEndpoints.length}</strong></p>
    </div>

    <div style="margin-bottom: 30px;">
      <h2 style="color: #2d3748; font-size: 18px;">Isolated Endpoints</h2>
      ${isolatedEndpoints.length > 0 ? `
        <ul style="font-size: 14px;">
          ${isolatedEndpoints.map(e => `<li style="margin-bottom: 5px;">${e.id} (${e.ip})</li>`).join('')}
        </ul>
      ` : '<p style="font-size: 14px; color: #718096;">No endpoints are currently isolated.</p>'}
    </div>

    <div>
      <h2 style="color: #2d3748; font-size: 18px;">Top OSINT/APT Alerts</h2>
      ${osintAlerts.length > 0 ? `
        <ul style="font-size: 14px; list-style-type: none; padding: 0;">
          ${osintAlerts.map(t => `
            <li style="margin-bottom: 15px; padding: 10px; background-color: #f7fafc; border-left: 4px solid #e53e3e;">
              <strong>${t.attack_type}</strong> - ${new Date(t.timestamp).toLocaleString()}<br/>
              <em style="color: #4a5568;">${t.analysis || 'Analysis unavailable'}</em>
            </li>
          `).join('')}
        </ul>
      ` : '<p style="font-size: 14px; color: #718096;">No OSINT/APT alerts detected.</p>'}
    </div>
  `;

  document.body.appendChild(reportDiv);

  try {
    const canvas = await html2canvas(reportDiv, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save('AegisNet_Report.pdf');
  } catch (error) {
    console.error('Error generating PDF report:', error);
  } finally {
    document.body.removeChild(reportDiv);
  }
};
