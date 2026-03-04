import React from 'react';
import { X, Info } from 'lucide-react';

export const HTTP_CODES_DATA = {
    "1xx: Information": [
        { code: "100", message: "Continue", description: "The server has received the request headers, and the client should proceed to send the request body" },
        { code: "101", message: "Switching Protocols", description: "The requester has asked the server to switch protocols" },
        { code: "103", message: "Early Hints", description: "Used with the Link header to allow the browser to start preloading resources while the server prepares a response" }
    ],
    "2xx: Successful": [
        { code: "200", message: "OK", description: "The request is OK (this is the standard response for successful HTTP requests)" },
        { code: "201", message: "Created", description: "The request has been fulfilled, and a new resource is created" },
        { code: "202", message: "Accepted", description: "The request has been accepted for processing, but the processing has not been completed" },
        { code: "203", message: "Non-Authoritative Information", description: "The request has been successfully processed, but is returning information that may be from another source" },
        { code: "204", message: "No Content", description: "The request has been successfully processed, but is not returning any content" },
        { code: "205", message: "Reset Content", description: "The request has been successfully processed, but is not returning any content, and requires that the requester reset the document view" },
        { code: "206", message: "Partial Content", description: "The server is delivering only part of the resource due to a range header sent by the client" }
    ],
    "3xx: Redirection": [
        { code: "300", message: "Multiple Choices", description: "A link list. The user can select a link and go to that location. Maximum five addresses" },
        { code: "301", message: "Moved Permanently", description: "The requested page has moved to a new URL" },
        { code: "302", message: "Found", description: "The requested page has moved temporarily to a new URL" },
        { code: "303", message: "See Other", description: "The requested page can be found under a different URL" },
        { code: "304", message: "Not Modified", description: "Indicates the requested page has not been modified since last requested" },
        { code: "307", message: "Temporary Redirect", description: "The requested page has moved temporarily to a new URL" },
        { code: "308", message: "Permanent Redirect", description: "The requested page has moved permanently to a new URL" }
    ],
    "4xx: Client Error": [
        { code: "400", message: "Bad Request", description: "The request cannot be fulfilled due to bad syntax" },
        { code: "401", message: "Unauthorized", description: "The request was a legal request, but the server is refusing to respond to it. For use when authentication is possible but has failed or not yet been provided" },
        { code: "402", message: "Payment Required", description: "Reserved for future use" },
        { code: "403", message: "Forbidden", description: "The request was a legal request, but the server is refusing to respond to it" },
        { code: "404", message: "Not Found", description: "The requested page could not be found but may be available again in the future" },
        { code: "405", message: "Method Not Allowed", description: "A request was made of a page using a request method not supported by that page" },
        { code: "406", message: "Not Acceptable", description: "The server can only generate a response that is not accepted by the client" },
        { code: "407", message: "Proxy Authentication Required", description: "The client must first authenticate itself with the proxy" },
        { code: "408", message: "Request Timeout", description: "The server timed out waiting for the request" },
        { code: "409", message: "Conflict", description: "The request could not be completed because of a conflict in the request" },
        { code: "410", message: "Gone", description: "The requested page is no longer available" },
        { code: "411", message: "Length Required", description: 'The "Content-Length" is not defined. The server will not accept the request without it' },
        { code: "412", message: "Precondition Failed", description: "The precondition given in the request evaluated to false by the server" },
        { code: "413", message: "Request Too Large", description: "The server will not accept the request, because the request entity is too large" },
        { code: "414", message: "Request-URI Too Long", description: "The server will not accept the request, because the URI is too long. Occurs when you convert a POST request to a GET request with a long query information" },
        { code: "415", message: "Unsupported Media Type", description: "The server will not accept the request, because the media type is not supported" },
        { code: "416", message: "Range Not Satisfiable", description: "The client has asked for a portion of the file, but the server cannot supply that portion" },
        { code: "417", message: "Expectation Failed", description: "The server cannot meet the requirements of the Expect request-header field" }
    ],
    "5xx: Server Error": [
        { code: "500", message: "Internal Server Error", description: "A generic error message, given when no more specific message is suitable" },
        { code: "501", message: "Not Implemented", description: "The server either does not recognize the request method, or it lacks the ability to fulfill the request" },
        { code: "502", message: "Bad Gateway", description: "The server was acting as a gateway or proxy and received an invalid response from the upstream server" },
        { code: "503", message: "Service Unavailable", description: "The server is currently unavailable (overloaded or down)" },
        { code: "504", message: "Gateway Timeout", description: "The server was acting as a gateway or proxy and did not receive a timely response from the upstream server" },
        { code: "505", message: "HTTP Version Not Supported", description: "The server does not support the HTTP protocol version used in the request" },
        { code: "511", message: "Network Authentication Required", description: "The client needs to authenticate to gain network access" }
    ]
};

export const FLAT_HTTP_CODES = Object.values(HTTP_CODES_DATA).flat();

export function HttpCodeInfoDrawer({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="w-[450px] h-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col animate-slide-in-right relative" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Info className="w-5 h-5 text-indigo-400" /> HTTP Status Codes Reference
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {Object.entries(HTTP_CODES_DATA).map(([category, codes]) => (
                        <div key={category} className="space-y-3">
                            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-widest sticky top-0 bg-slate-900 py-1">{category}</h3>
                            <div className="space-y-2">
                                {codes.map(c => (
                                    <div key={c.code} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-black px-1.5 py-0.5 rounded ${c.code.startsWith('2') ? 'bg-emerald-500/10 text-emerald-400' : c.code.startsWith('3') ? 'bg-blue-500/10 text-blue-400' : c.code.startsWith('4') ? 'bg-amber-500/10 text-amber-400' : c.code.startsWith('5') ? 'bg-red-500/10 text-red-400' : 'bg-slate-500/10 text-slate-400'}`}>
                                                {c.code}
                                            </span>
                                            <span className="text-sm font-bold text-slate-200">{c.message}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">{c.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
