-- ============================================================
-- PAKISTAN LEGAL AI AGENT - COMPLETE DATABASE SCHEMA
-- PostgreSQL 15+
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'advocate', 'student', 'client', 'researcher');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
CREATE TYPE case_status AS ENUM ('open', 'closed', 'pending', 'archived', 'won', 'lost');
CREATE TYPE document_type AS ENUM ('fir', 'notice', 'judgment', 'plaint', 'objection', 'contract', 'petition', 'affidavit', 'bail_application', 'other');
CREATE TYPE draft_type AS ENUM ('bail_application', 'civil_suit', 'legal_notice', 'reply_notice', 'written_statement', 'petition', 'affidavit', 'contract', 'appeal', 'pre_arrest_bail', 'post_arrest_bail', 'objection_reply', 'preliminary_objections', 'appeal_grounds', 'other');
CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE notification_type AS ENUM ('case_update', 'document_uploaded', 'draft_ready', 'system', 'reminder');
CREATE TYPE language_preference AS ENUM ('english', 'urdu', 'roman_urdu', 'bilingual');

-- ============================================================
-- USERS TABLE
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'client',
    status user_status NOT NULL DEFAULT 'active',
    language_preference language_preference NOT NULL DEFAULT 'english',
    phone VARCHAR(20),
    bar_council_number VARCHAR(100),
    specialization TEXT[],
    profile_image_url TEXT,
    bio TEXT,
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ============================================================
-- CASES TABLE
-- ============================================================

CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    case_number VARCHAR(100),
    court_name VARCHAR(255),
    judge_name VARCHAR(255),
    opposing_party VARCHAR(255),
    opposing_advocate VARCHAR(255),
    status case_status NOT NULL DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    hearing_date TIMESTAMP WITH TIME ZONE,
    next_action TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cases_user_id ON cases(user_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);

-- ============================================================
-- DOCUMENTS TABLE
-- ============================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    file_type document_type NOT NULL DEFAULT 'other',
    mime_type VARCHAR(100),
    file_size INTEGER,
    file_path TEXT NOT NULL,
    is_ocr_processed BOOLEAN DEFAULT FALSE,
    ocr_text TEXT,
    ocr_confidence DECIMAL(5,2),
    language VARCHAR(50) DEFAULT 'english',
    analysis_status analysis_status DEFAULT 'pending',
    analysis_result JSONB,
    is_encrypted BOOLEAN DEFAULT FALSE,
    encryption_key_ref VARCHAR(255),
    tags TEXT[],
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_case_id ON documents(case_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_analysis_status ON documents(analysis_status);

-- ============================================================
-- DRAFTS TABLE
-- ============================================================

CREATE TABLE drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    draft_type draft_type NOT NULL,
    content TEXT NOT NULL,
    content_urdu TEXT,
    language language_preference DEFAULT 'english',
    version INTEGER DEFAULT 1,
    is_published BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    ai_model_used VARCHAR(100),
    generation_prompt TEXT,
    tokens_used INTEGER,
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_drafts_case_id ON drafts(case_id);
CREATE INDEX idx_drafts_user_id ON drafts(user_id);
CREATE INDEX idx_drafts_draft_type ON drafts(draft_type);

-- ============================================================
-- CHAT HISTORY TABLE
-- ============================================================

CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    message_urdu TEXT,
    language VARCHAR(50) DEFAULT 'english',
    tokens_used INTEGER,
    model_used VARCHAR(100),
    context_data JSONB,
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX idx_chat_history_case_id ON chat_history(case_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);

-- ============================================================
-- RESEARCH HISTORY TABLE
-- ============================================================

CREATE TABLE research_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    query_language VARCHAR(50) DEFAULT 'english',
    results JSONB,
    citations TEXT[],
    relevant_laws TEXT[],
    relevant_cases TEXT[],
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_research_history_user_id ON research_history(user_id);
CREATE INDEX idx_research_history_created_at ON research_history(created_at DESC);

-- ============================================================
-- FIR ANALYSIS TABLE
-- ============================================================

CREATE TABLE fir_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    fir_number VARCHAR(100),
    police_station VARCHAR(255),
    complainant_name VARCHAR(255),
    accused_names TEXT[],
    sections_applied TEXT[],
    allegations TEXT,
    incident_date TIMESTAMP WITH TIME ZONE,
    timeline JSONB,
    bail_possibility VARCHAR(50),
    bail_reasoning TEXT,
    defence_suggestions TEXT[],
    weak_points TEXT[],
    strong_points TEXT[],
    generated_drafts JSONB,
    ai_summary TEXT,
    raw_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fir_analyses_user_id ON fir_analyses(user_id);
CREATE INDEX idx_fir_analyses_document_id ON fir_analyses(document_id);

-- ============================================================
-- NOTICE ANALYSES TABLE
-- ============================================================

CREATE TABLE notice_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    notice_type VARCHAR(100),
    sender_name VARCHAR(255),
    recipient_name VARCHAR(255),
    notice_date TIMESTAMP WITH TIME ZONE,
    demand_amount DECIMAL(15,2),
    demands TEXT[],
    legal_issues TEXT[],
    summary TEXT,
    response_deadline TIMESTAMP WITH TIME ZONE,
    defence_strategy TEXT,
    generated_reply TEXT,
    raw_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notice_analyses_user_id ON notice_analyses(user_id);

-- ============================================================
-- JUDGMENT ANALYSES TABLE
-- ============================================================

CREATE TABLE judgment_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    court_name VARCHAR(255),
    judgment_date TIMESTAMP WITH TIME ZONE,
    parties JSONB,
    facts TEXT,
    issues TEXT[],
    arguments JSONB,
    findings TEXT,
    decision TEXT,
    appeal_grounds TEXT[],
    precedents TEXT[],
    applicable_laws TEXT[],
    ai_summary TEXT,
    raw_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_judgment_analyses_user_id ON judgment_analyses(user_id);

-- ============================================================
-- STUDENT MODE TABLE
-- ============================================================

CREATE TABLE student_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('mcq', 'viva', 'notes', 'summary', 'case_brief')),
    topic VARCHAR(500) NOT NULL,
    subject VARCHAR(255),
    law_area VARCHAR(255),
    content JSONB NOT NULL,
    difficulty_level VARCHAR(20) DEFAULT 'intermediate',
    language language_preference DEFAULT 'english',
    is_bookmarked BOOLEAN DEFAULT FALSE,
    score INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_student_resources_user_id ON student_resources(user_id);
CREATE INDEX idx_student_resources_resource_type ON student_resources(resource_type);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_data JSONB,
    response_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- API USAGE TABLE
-- ============================================================

CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature VARCHAR(100) NOT NULL,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    model_used VARCHAR(100),
    cost_usd DECIMAL(10,6),
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_feature ON api_usage(feature);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at DESC);

-- ============================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL DEFAULT 'free',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    tokens_limit INTEGER DEFAULT 50000,
    tokens_used INTEGER DEFAULT 0,
    documents_limit INTEGER DEFAULT 10,
    documents_used INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(100),
    payment_reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_drafts_updated_at BEFORE UPDATE ON drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_fir_updated_at BEFORE UPDATE ON fir_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notice_updated_at BEFORE UPDATE ON notice_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_judgment_updated_at BEFORE UPDATE ON judgment_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DATA: Default Admin User
-- password: Admin@12345 (bcrypt hashed)
-- ============================================================

INSERT INTO users (name, email, password_hash, role, status, is_email_verified) VALUES
('Super Admin', 'admin@legalpk.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJMs3OES8Kn6b5JpFKd9LHRC', 'admin', 'active', TRUE),
('Test Advocate', 'advocate@legalpk.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJMs3OES8Kn6b5JpFKd9LHRC', 'advocate', 'active', TRUE),
('Law Student', 'student@legalpk.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJMs3OES8Kn6b5JpFKd9LHRC', 'student', 'active', TRUE);

INSERT INTO subscriptions (user_id, plan, tokens_limit) 
SELECT id, 'enterprise', 1000000 FROM users WHERE email = 'admin@legalpk.ai';

INSERT INTO subscriptions (user_id, plan, tokens_limit) 
SELECT id, 'professional', 200000 FROM users WHERE email = 'advocate@legalpk.ai';

INSERT INTO subscriptions (user_id, plan, tokens_limit) 
SELECT id, 'student', 50000 FROM users WHERE email = 'student@legalpk.ai';

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW user_dashboard_stats AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    COUNT(DISTINCT c.id) AS total_cases,
    COUNT(DISTINCT d.id) AS total_documents,
    COUNT(DISTINCT dr.id) AS total_drafts,
    COUNT(DISTINCT ch.id) AS total_chats,
    s.plan,
    s.tokens_used,
    s.tokens_limit
FROM users u
LEFT JOIN cases c ON c.user_id = u.id
LEFT JOIN documents d ON d.user_id = u.id
LEFT JOIN drafts dr ON dr.user_id = u.id
LEFT JOIN chat_history ch ON ch.user_id = u.id AND ch.role = 'user'
LEFT JOIN subscriptions s ON s.user_id = u.id
GROUP BY u.id, u.name, u.email, u.role, s.plan, s.tokens_used, s.tokens_limit;
