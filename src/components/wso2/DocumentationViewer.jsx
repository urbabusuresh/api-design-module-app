import React, { useState, useEffect } from 'react';
import { FileText, Link as LinkIcon, File, ChevronRight, Download, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../api';

const DocumentationViewer = ({ apiItem, project }) => {
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [docContent, setDocContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [contentLoading, setContentLoading] = useState(false);

    useEffect(() => {
        loadDocuments();
    }, [apiItem]);

    const loadDocuments = async () => {
        try {
            setLoading(true);
            let targetId = apiItem.wso2_id || apiItem.id.split('_op_')[0];
            const data = await api.getWso2ApiDocuments(project.id, targetId);
            setDocuments(data.list || []);
            if (data.list && data.list.length > 0) {
                handleDocSelect(data.list[0]);
            }
        } catch (e) {
            console.error("Failed to load documents", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDocSelect = async (doc) => {
        setSelectedDoc(doc);
        if (doc.sourceType === 'INLINE' || doc.sourceType === 'MARKDOWN') {
            try {
                setContentLoading(true);
                let targetId = apiItem.wso2_id || apiItem.id.split('_op_')[0];
                const content = await api.getWso2ApiDocumentContent(project.id, targetId, doc.documentId);
                setDocContent(content);
            } catch (e) {
                console.error("Failed to load document content", e);
                setDocContent("Failed to load content.");
            } finally {
                setContentLoading(false);
            }
        } else {
            setDocContent('');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10 text-slate-500">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
                <span>Loading documentation...</span>
            </div>
        );
    }

    return (
        <div className="flex h-full gap-6">
            {/* Sidebar with Document List */}
            <div className="w-64 border-r border-slate-800 pr-6 space-y-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-2 mb-4">Documents</h3>
                {documents.length > 0 ? (
                    documents.map((doc) => (
                        <button
                            key={doc.documentId}
                            onClick={() => handleDocSelect(doc)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${selectedDoc?.documentId === doc.documentId
                                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            {doc.sourceType === 'URL' ? <LinkIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            <span className="truncate flex-1 text-left">{doc.name}</span>
                            <ChevronRight className={`w-3 h-3 transition-transform ${selectedDoc?.documentId === doc.documentId ? 'rotate-90' : ''}`} />
                        </button>
                    ))
                ) : (
                    <div className="px-2 text-slate-500 text-sm">No documentation found.</div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-slate-900/30 rounded-xl border border-slate-800 p-6 overflow-y-auto">
                {selectedDoc ? (
                    <div className="space-y-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">{selectedDoc.name}</h2>
                                <p className="text-sm text-slate-400">{selectedDoc.summary || "No summary provided."}</p>
                            </div>
                            <div className="flex gap-2">
                                {selectedDoc.sourceType === 'URL' && (
                                    <a
                                        href={selectedDoc.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-white transition-colors"
                                    >
                                        <Eye className="w-3 h-3" />
                                        Open Link
                                    </a>
                                )}
                                {selectedDoc.sourceType === 'FILE' && (
                                    <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-white transition-colors">
                                        <Download className="w-3 h-3" />
                                        Download File
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-slate-800 w-full" />

                        {contentLoading ? (
                            <div className="flex items-center justify-center py-20 text-slate-500">
                                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
                                <span>Loading content...</span>
                            </div>
                        ) : selectedDoc.sourceType === 'INLINE' || selectedDoc.sourceType === 'MARKDOWN' ? (
                            <div className="prose prose-invert max-w-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
                                <ReactMarkdown>{docContent}</ReactMarkdown>
                            </div>
                        ) : selectedDoc.sourceType === 'URL' ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center">
                                <LinkIcon className="w-12 h-12 mb-4 opacity-20" />
                                <p className="max-w-md">This document is hosted externally. Click the "Open Link" button above to view it in a new tab.</p>
                                <p className="text-xs mt-2 font-mono">{selectedDoc.sourceUrl}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center">
                                <File className="w-12 h-12 mb-4 opacity-20" />
                                <p>This is a file-based document. Click the "Download File" button above to view it.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                        <p>Select a document to view its content</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentationViewer;
