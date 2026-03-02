import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Layers, Box, ChevronRight, Layout, Info } from 'lucide-react';
import { api } from '../../api';

const ApiProductsPanel = ({ project }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        loadProducts();
    }, [project]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await api.getWso2ApiProducts(project.id);
            setProducts(data.list || []);
        } catch (e) {
            console.error("Failed to load products", e);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.context.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && !products.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p>Loading API Products...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 overflow-hidden h-full flex flex-col">
            <div className="flex justify-between items-end flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">API Products</h2>
                    <p className="text-slate-400 text-sm">Bundle multiple APIs into a single logical product.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-64 transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all">
                        <Plus className="w-4 h-4" />
                        New Product
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden h-full flex gap-6">
                {/* Product List */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 pt-1">
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                            <div
                                key={product.id}
                                onClick={() => setSelectedProduct(product)}
                                className={`group p-5 bg-slate-900/40 border rounded-2xl cursor-pointer transition-all ${selectedProduct?.id === product.id
                                        ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-indigo-500/5'
                                        : 'border-slate-800 hover:border-slate-700'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className={`p-3 rounded-xl transition-colors ${selectedProduct?.id === product.id ? 'bg-indigo-500/20' : 'bg-slate-800 group-hover:bg-slate-700'
                                            }`}>
                                            <Package className={`w-6 h-6 ${selectedProduct?.id === product.id ? 'text-indigo-400' : 'text-slate-400'}`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-white group-hover:text-indigo-400">{product.name}</h3>
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                                                    V{product.version}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-mono mb-2">{product.context}</p>
                                            <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                <span className={`${product.state === 'PUBLISHED' ? 'text-emerald-400' : 'text-slate-500'
                                                    }`}>
                                                    {product.state || 'CREATED'}
                                                </span>
                                                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                                <span>{product.apis?.length || 0} APIs bundled</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 transition-transform ${selectedProduct?.id === product.id ? 'rotate-90 text-indigo-400' : 'text-slate-700'}`} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center">
                            <Package className="w-16 h-16 mb-4 opacity-10" />
                            <p className="text-lg font-medium">No products found</p>
                            <p className="text-sm">Create an API product to group multiple APIs into a single package.</p>
                        </div>
                    )}
                </div>

                {/* Info Panel / Detail */}
                <div className="w-80 flex-shrink-0">
                    {selectedProduct ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl h-full flex flex-col p-6 sticky top-0 overflow-y-auto">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 px-1">Product Details</h4>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 px-1">Visibility</label>
                                    <div className="flex items-center gap-2 text-sm text-slate-300 px-1 font-medium">
                                        <Box className="w-3.5 h-3.5 text-indigo-500" />
                                        {selectedProduct.visibility || "Public"}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 px-1">Description</label>
                                    <p className="text-xs text-slate-400 leading-relaxed px-1">
                                        {selectedProduct.description || "No description provided for this API product."}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-3 px-1">Bundled APIs</label>
                                    <div className="space-y-2">
                                        {(selectedProduct.apis || []).map((api, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-2 bg-slate-800/40 border border-slate-700/50 rounded-lg group/api hover:border-indigo-500/30 transition-all">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-400 group-hover/api:bg-indigo-500/20">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-200 truncate">{api.name || "API Endpoint"}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono truncate">{api.version || "1.0.0"}</p>
                                                </div>
                                            </div>
                                        ))}

                                        {(!selectedProduct.apis || selectedProduct.apis.length === 0) && (
                                            <div className="text-center py-4 text-xs text-slate-500 italic">No APIs bundled.</div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 mt-auto">
                                    <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700">
                                        <Layout className="w-3.5 h-3.5" />
                                        Advanced Configuration
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900/30 border border-slate-800 border-dashed rounded-2xl h-full flex flex-col items-center justify-center p-6 text-center text-slate-600">
                            <Info className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-sm font-medium">Select a product to view its configuration and bundled endpoints.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApiProductsPanel;
