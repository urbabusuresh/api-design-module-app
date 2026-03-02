-- Database Schema for RaptrDXP API Dashboard
-- Combined and Optimized for production
-- Defines Projects, Systems, Services, APIs, Dependencies, Users, and Settings

CREATE DATABASE IF NOT EXISTS raptr_dxp_db;
USE raptr_dxp_db;

-- 1. Projects Table
-- Stores high-level project information
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    type VARCHAR(20) DEFAULT 'LOCAL', -- 'LOCAL' or 'WSO2_REMOTE'
    connection_details JSON, -- Stores { url, env, auth... }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.5 Project Modules Table (NEW)
-- Stores modules and their associated Swagger/OpenAPI specs
CREATE TABLE IF NOT EXISTS project_modules (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    swagger_url VARCHAR(500),
    env_urls JSON, -- Stores { DEV: 'url1', SIT: 'url2' }
    swagger_content LONGTEXT, -- Stores the JSON/YAML content
    status VARCHAR(50) DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 2. Project LOV (List of Values) Table
-- Stores configurable settings like Categories, Channels, Segments
CREATE TABLE IF NOT EXISTS project_lov (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'CATEGORY', 'NB_CHANNEL', 'SB_CHANNEL', 'MARKET_SEGMENT'
    value VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_type (project_id, type)
);

-- 3. Systems Table
-- Represents a domain or group of services (e.g. "CRM", "Billing")
CREATE TABLE IF NOT EXISTS systems (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 4. Services (Root APIs) Table
-- Represents a specific service or resource collection (e.g. "Customer API", "Order API")
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(50) PRIMARY KEY,
    system_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    context VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
);

-- 5. API Catalog (Endpoints) Table
-- The master table for all API endpoints, including both Main APIs and Downstream Maps
CREATE TABLE IF NOT EXISTS api_catalog (
    id VARCHAR(50) PRIMARY KEY,
    service_id VARCHAR(50), 
    api_name VARCHAR(255) NOT NULL,
    api_version VARCHAR(50) DEFAULT 'v1',
    module VARCHAR(100), -- Linked match to project_lov CATEGORY
    description TEXT,
    url VARCHAR(255),
    http_method VARCHAR(10),
    status VARCHAR(50) DEFAULT 'Draft',
    
    -- JSON blobs for complex nested structures
    headers JSON,
    request_body JSON,
    response_body JSON,
    authentication JSON,
    
    -- Legacy JSON channel map (deprecated but kept for fallback reader)
    channels JSON,
    
    -- Southbound Provider Metadata
    provider_system VARCHAR(100), -- Name of the SB Channel providing this API
    
    -- Documentation Links
    swagger_url VARCHAR(255),
    swagger_api_name VARCHAR(255),
    design_doc VARCHAR(255),
    reference_link VARCHAR(255),
    remarks TEXT,
    
    -- NB to SB Design Mapper metadata (field-level mapping)
    design_metadata JSON,
    
    -- Audit
    created_by VARCHAR(100),
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- 6. API Dependencies Table
-- Manages relationships between APIs (Parent calls Child)
CREATE TABLE IF NOT EXISTS api_dependencies (
    id VARCHAR(50) PRIMARY KEY,
    parent_api_id VARCHAR(50) NOT NULL,
    child_api_id VARCHAR(50) NOT NULL, -- The downstream API being called
    priority INT DEFAULT 1,
    type VARCHAR(50) DEFAULT 'Direct', -- Direct, Async, Failover
    child_source VARCHAR(20) DEFAULT 'catalog', -- 'catalog' or 'module'
    
    FOREIGN KEY (parent_api_id) REFERENCES api_catalog(id) ON DELETE CASCADE
    -- Child FK removed to allow for Module APIs
    -- FOREIGN KEY (child_api_id) REFERENCES api_catalog(id) ON DELETE CASCADE
);

-- 8. Module API Catalog (NEW)
CREATE TABLE IF NOT EXISTS module_api_catalog (
    id VARCHAR(50) PRIMARY KEY,
    module_id VARCHAR(50) NOT NULL,
    api_name VARCHAR(255) NOT NULL,
    api_version VARCHAR(50) DEFAULT 'v1',
    description TEXT,
    url VARCHAR(255),
    http_method VARCHAR(10),
    status VARCHAR(50) DEFAULT 'Active',
    
    headers JSON,
    request_body JSON,
    response_body JSON,
    authentication JSON,
    
    provider_system VARCHAR(100),
    swagger_reference VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (module_id) REFERENCES project_modules(id) ON DELETE CASCADE
);

-- 7. Users Table
-- Portal authentication users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Plain text for MVP, Hash for Prod
    role VARCHAR(20) DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 9. Project Authentication Profiles
CREATE TABLE IF NOT EXISTS project_authentications (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'Bearer', 'Basic', 'API Key'
    details JSON, -- Stores token, username/password, or key/value
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 10. API Test Logs
CREATE TABLE IF NOT EXISTS api_test_logs (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    api_id VARCHAR(50), -- Can be NULL if testing ad-hoc URL
    url VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_headers JSON,
    request_body JSON,
    response_status INT,
    response_body JSON,
    response_headers JSON,
    duration VARCHAR(20),
    tested_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
