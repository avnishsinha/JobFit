"""Initial JobFit persistence schema."""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("users", sa.Column("id", sa.String(36), primary_key=True), sa.Column("email", sa.String(320), nullable=False, unique=True), sa.Column("password_hash", sa.String(255), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_table("resumes", sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("name", sa.String(200), nullable=False), sa.Column("text", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_resumes_user_id", "resumes", ["user_id"])
    op.create_table("jobs", sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("title", sa.String(200), nullable=False), sa.Column("company", sa.String(200)), sa.Column("description", sa.Text(), nullable=False), sa.Column("url", sa.String(2048)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_jobs_user_id", "jobs", ["user_id"])
    op.create_table("analyses", sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("resume_id", sa.String(36), sa.ForeignKey("resumes.id", ondelete="RESTRICT"), nullable=False), sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id", ondelete="RESTRICT"), nullable=False), sa.Column("overall_compatibility", sa.Float(), nullable=False), sa.Column("model_id", sa.String(255), nullable=False), sa.Column("scoring_version", sa.String(100), nullable=False), sa.Column("strong_threshold", sa.Float(), nullable=False), sa.Column("partial_threshold", sa.Float(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_analyses_user_id", "analyses", ["user_id"])
    op.create_table("analysis_requirements", sa.Column("id", sa.String(36), primary_key=True), sa.Column("analysis_id", sa.String(36), sa.ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False), sa.Column("position", sa.Integer(), nullable=False), sa.Column("requirement", sa.Text(), nullable=False), sa.Column("classification", sa.String(50), nullable=False), sa.Column("similarity", sa.Float(), nullable=False), sa.Column("supporting_evidence", sa.Text()), sa.Column("explanation", sa.Text(), nullable=False))
    op.create_index("ix_analysis_requirements_analysis_id", "analysis_requirements", ["analysis_id"])
    op.create_table("subscriptions", sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True), sa.Column("plan", sa.String(20), nullable=False), sa.Column("status", sa.String(30), nullable=False), sa.Column("stripe_customer_id", sa.String(255), unique=True), sa.Column("stripe_subscription_id", sa.String(255), unique=True), sa.Column("current_period_end", sa.DateTime(timezone=True)))
    op.create_table("usage_records", sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("period_key", sa.String(7), nullable=False), sa.Column("analysis_count", sa.Integer(), nullable=False), sa.UniqueConstraint("user_id", "period_key", name="uq_usage_user_period"))
    op.create_index("ix_usage_user_period", "usage_records", ["user_id", "period_key"])
    op.create_table("webhook_events", sa.Column("id", sa.String(36), primary_key=True), sa.Column("stripe_event_id", sa.String(255), nullable=False, unique=True), sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_webhook_events_stripe_event_id", "webhook_events", ["stripe_event_id"])


def downgrade() -> None:
    for table in ["webhook_events", "usage_records", "subscriptions", "analysis_requirements", "analyses", "jobs", "resumes", "users"]:
        op.drop_table(table)
