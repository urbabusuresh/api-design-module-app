import { useEffect } from 'react';

/**
 * useKeyboardShortcuts
 * Register global keyboard shortcuts.
 * shortcuts = [{ key: 'Enter', ctrl: true, action: () => {} }]
 */
export function useKeyboardShortcuts(shortcuts = []) {
    useEffect(() => {
        const handler = (e) => {
            for (const shortcut of shortcuts) {
                const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
                const shiftMatch = shortcut.shift ? e.shiftKey : true;
                const keyMatch = e.key === shortcut.key || e.code === shortcut.key;
                if (ctrlMatch && shiftMatch && keyMatch) {
                    // Don't fire inside inputs unless explicitly allowed
                    if (!shortcut.allowInInput && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) continue;
                    e.preventDefault();
                    shortcut.action(e);
                }
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [shortcuts]);
}

/**
 * formatXml - Prettifies an XML or SOAP string with indentation.
 * Returns formatted string or original if it fails.
 */
export function formatXml(xml) {
    if (!xml || typeof xml !== 'string') return xml;
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml.trim(), 'text/xml');
        if (doc.querySelector('parsererror')) return xml; // Invalid XML — return as is

        const serialize = (node, depth = 0) => {
            const indent = '  '.repeat(depth);
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                return text ? text : null;
            }
            if (node.nodeType === Node.COMMENT_NODE) {
                return `${indent}<!-- ${node.textContent.trim()} -->`;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return null;

            const tagName = node.nodeName;
            const attrs = Array.from(node.attributes).map(a => ` ${a.name}="${a.value}"`).join('');

            if (!node.hasChildNodes()) return `${indent}<${tagName}${attrs}/>`;

            const children = Array.from(node.childNodes).map(c => serialize(c, depth + 1)).filter(Boolean);

            if (children.length === 1 && !children[0].includes('\n')) {
                return `${indent}<${tagName}${attrs}>${children[0]}</${tagName}>`;
            }
            return `${indent}<${tagName}${attrs}>\n${children.map(c => c.startsWith(indent) ? c : indent + '  ' + c).join('\n')}\n${indent}</${tagName}>`;
        };

        return serialize(doc.documentElement, 0) || xml;
    } catch {
        return xml;
    }
}

/**
 * isXml - Detects if a string is XML
 */
export function isXml(str) {
    if (!str || typeof str !== 'string') return false;
    return str.trim().startsWith('<') && str.trim().endsWith('>');
}
