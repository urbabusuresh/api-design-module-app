import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';

export const exportToExcel = (apis, projectName) => {
    const data = apis.map(api => ({
        'API Name': api.name || '',
        'System': api.systemName || '',
        'Service': api.serviceName || '',
        'Method': api.method || '',
        'Endpoint URL': api.url || '',
        'Description': api.description || '',
        'Status': api.status || 'Draft',
        'NB Consumers': (api.consumers || []).map(c => c.name).join(', '),
        'SB Providers (Downstream)': (api.downstream || []).map(d => `${d.providerSystem || d.name} (${d.url})`).join('\n'),
        'Headers': (api.headers || []).map(h => `${h.key}: ${h.value}`).join('\n'),
        'Request Sample': typeof api.request === 'string' ? api.request : JSON.stringify(api.request || {}),
        'Responses Count': (api.responses || []).length,
        'Remarks': api.remarks || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LLD APIs');
    XLSX.writeFile(wb, `${projectName}_LLD_Export.xlsx`);
};

export const exportToPDF = (apis, projectName) => {
    const doc = new jsPDF('landscape');

    doc.setFontSize(20);
    doc.text(`${projectName} - Low Level Design (LLD)`, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    let yPos = 40;

    apis.forEach((api, index) => {
        if (index !== 0) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(`[${api.method}] ${api.name}`, 14, yPos);
        yPos += 8;

        doc.setFontSize(11);
        doc.text(`URL: ${api.url}`, 14, yPos);
        yPos += 6;
        doc.text(`System: ${api.systemName} | Service: ${api.serviceName}`, 14, yPos);
        yPos += 10;

        const detailsRows = [
            ['Description', api.description || 'N/A'],
            ['Status', api.status || 'Draft'],
            ['NB Consumers', (api.consumers || []).map(c => c.name).join(', ') || 'None'],
            ['SB Providers', (api.downstream || []).map(d => `${d.providerSystem || d.name} (${d.method} ${d.url})`).join('\n') || 'None']
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Property', 'Details']],
            body: detailsRows,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }
        });

        yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 40;

        // Headers
        if (api.headers && api.headers.length > 0) {
            const hRows = api.headers.map(h => [h.key, h.value]);
            doc.text('Headers', 14, yPos);
            autoTable(doc, {
                startY: yPos + 4,
                head: [['Key', 'Value']],
                body: hRows,
                theme: 'striped',
                headStyles: { fillColor: [14, 116, 144] }
            });
            yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 40;
        }

        // Add a new page if getting full
        if (yPos > 170) {
            doc.addPage();
            yPos = 20;
        }

        // Request Body
        if (api.request) {
            doc.text('Request Body Sample', 14, yPos);
            yPos += 6;
            doc.setFontSize(9);
            const reqStr = typeof api.request === 'string' ? api.request : JSON.stringify(api.request, null, 2);
            doc.text(doc.splitTextToSize(reqStr, 250), 14, yPos);
            yPos += doc.splitTextToSize(reqStr, 250).length * 4 + 10;
        }

        if (yPos > 170) {
            doc.addPage();
            yPos = 20;
        }

        // Responses
        if (api.responses && api.responses.length > 0) {
            doc.setFontSize(11);
            doc.text('Responses', 14, yPos);
            const rRows = api.responses.map(r => [r.code, r.description, r.body ? 'Yes' : 'No']);
            autoTable(doc, {
                startY: yPos + 4,
                head: [['Code', 'Description', 'Has Body']],
                body: rRows,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] }
            });
            yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 40;
        }
    });

    doc.save(`${projectName}_LLD_Export.pdf`);
};

export const exportToWord = async (apis, projectName) => {
    const children = [
        new Paragraph({
            text: `${projectName} - Low Level Design (LLD)`,
            heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
            text: `Generated on: ${new Date().toLocaleDateString()}`,
            spacing: { after: 400 },
        })
    ];

    apis.forEach(api => {
        children.push(
            new Paragraph({
                text: `[${api.method}] ${api.name}`,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
            }),
            new Paragraph({ text: `URL: ${api.url}`, spacing: { after: 100 } }),
            new Paragraph({ text: `System: ${api.systemName} | Service: ${api.serviceName}`, spacing: { after: 100 } }),
            new Paragraph({ text: `Description: ${api.description || 'N/A'}`, spacing: { after: 100 } }),
            new Paragraph({ text: `Status: ${api.status || 'Draft'}`, spacing: { after: 100 } })
        );

        if (api.consumers && api.consumers.length > 0) {
            children.push(new Paragraph({ text: `NB Consumers: ${api.consumers.map(c => c.name).join(', ')}`, spacing: { after: 100 } }));
        }

        if (api.downstream && api.downstream.length > 0) {
            children.push(new Paragraph({ text: 'SB Providers (Downstream):', spacing: { after: 100 } }));
            api.downstream.forEach(d => {
                children.push(new Paragraph({ text: `- ${d.providerSystem || d.name}: ${d.method || 'GET'} ${d.url}`, indent: { left: 720 }, spacing: { after: 50 } }));
            });
        }

        if (api.headers && api.headers.length > 0) {
            children.push(new Paragraph({ text: 'Headers:', heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
            api.headers.forEach(h => {
                children.push(new Paragraph({ text: `${h.key}: ${h.value}`, indent: { left: 720 } }));
            });
        }

        if (api.request) {
            children.push(new Paragraph({ text: 'Request Sample:', heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
            const reqStr = typeof api.request === 'string' ? api.request : JSON.stringify(api.request, null, 2);
            children.push(new Paragraph({ children: [new TextRun({ text: reqStr, font: 'Courier New', size: 20 })] }));
        }

        if (api.responses && api.responses.length > 0) {
            children.push(new Paragraph({ text: 'Responses:', heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
            api.responses.forEach(r => {
                children.push(new Paragraph({ text: `${r.code} - ${r.description}`, indent: { left: 720 } }));
            });
        }

        children.push(new Paragraph({ text: '', pageBreakBefore: true }));
    });

    const doc = new Document({
        sections: [{ properties: {}, children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${projectName}_LLD_Export.docx`);
};

export const exportToJSON = (apis, projectName) => {
    const blob = new Blob([JSON.stringify(apis, null, 2)], { type: 'application/json' });
    saveAs(blob, `${projectName}_LLD_Export.json`);
};
