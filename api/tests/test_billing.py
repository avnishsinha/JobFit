from datetime import datetime, timezone
from dataclasses import replace

from app.config import settings
from app.models import Subscription, UsageRecord
from app.services import billing
from app.services.persistence import FREE_ANALYSIS_LIMIT, ensure_analysis_entitlement


def test_free_entitlement_allows_five_analyses_and_blocks_six(db_session) -> None:
    user_id = "user-1"
    db_session.add(Subscription(user_id=user_id, plan="free", status="active"))
    db_session.add(
        UsageRecord(
            user_id=user_id,
            period_key=datetime.now(timezone.utc).strftime("%Y-%m"),
            analysis_count=FREE_ANALYSIS_LIMIT,
        )
    )
    db_session.commit()

    try:
        ensure_analysis_entitlement(db_session, user_id)
    except ValueError as error:
        assert "limit" in str(error)
    else:
        raise AssertionError("Expected the free analysis limit to be enforced.")


def test_webhook_updates_subscription_and_is_idempotent(db_session, monkeypatch) -> None:
    subscription = Subscription(
        user_id="user-2",
        stripe_customer_id="cus_test",
        plan="free",
        status="active",
    )
    db_session.add(subscription)
    db_session.commit()
    monkeypatch.setattr(billing, "settings", replace(settings, stripe_webhook_secret="whsec_test"))
    monkeypatch.setattr(
        billing.stripe.Webhook,
        "construct_event",
        lambda payload, signature, secret: {
            "id": "evt_test",
            "type": "customer.subscription.updated",
            "data": {"object": {"id": "sub_test", "customer": "cus_test", "status": "active"}},
        },
    )

    billing.process_webhook(db_session, b"payload", "signature")
    db_session.commit()
    billing.process_webhook(db_session, b"payload", "signature")

    refreshed = db_session.query(Subscription).filter_by(user_id="user-2").one()
    assert refreshed.plan == "pro"
    assert db_session.query(billing.WebhookEvent).count() == 1
