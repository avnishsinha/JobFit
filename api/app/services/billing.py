from typing import Any

import stripe
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Subscription, User, WebhookEvent


def create_checkout_session(db: Session, user: User) -> str:
    if not settings.stripe_secret_key or not settings.stripe_pro_price_id:
        raise ValueError("Stripe billing is not configured.")
    stripe.api_key = settings.stripe_secret_key
    subscription = user.subscription or Subscription(user_id=user.id)
    db.add(subscription)
    db.flush()
    customer_id = subscription.stripe_customer_id
    if not customer_id:
        customer = stripe.Customer.create(email=user.email, metadata={"user_id": user.id})
        customer_id = customer.id
        subscription.stripe_customer_id = customer_id
    checkout = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": settings.stripe_pro_price_id, "quantity": 1}],
        success_url=f"{settings.frontend_origin}/billing?success=1",
        cancel_url=f"{settings.frontend_origin}/billing?cancelled=1",
        metadata={"user_id": user.id},
    )
    return checkout.url


def create_portal_session(user: User) -> str:
    if not settings.stripe_secret_key or not user.subscription or not user.subscription.stripe_customer_id:
        raise ValueError("No active billing customer is configured.")
    stripe.api_key = settings.stripe_secret_key
    portal = stripe.billing_portal.Session.create(
        customer=user.subscription.stripe_customer_id,
        return_url=f"{settings.frontend_origin}/billing",
    )
    return portal.url


def process_webhook(db: Session, payload: bytes, signature: str) -> None:
    if not settings.stripe_webhook_secret:
        raise ValueError("Stripe webhook is not configured.")
    event = stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)
    event_id = event["id"]
    if db.query(WebhookEvent).filter_by(stripe_event_id=event_id).first():
        return
    event_type = event["type"]
    data: Any = event["data"]["object"]
    customer_id = data.get("customer")
    subscription = db.query(Subscription).filter_by(stripe_customer_id=customer_id).first()
    if subscription and event_type in {"customer.subscription.created", "customer.subscription.updated"}:
        subscription.stripe_subscription_id = data.get("id")
        subscription.status = data.get("status", "active")
        subscription.plan = "pro" if subscription.status in {"active", "trialing"} else "free"
    elif subscription and event_type == "customer.subscription.deleted":
        subscription.status = "canceled"
        subscription.plan = "free"
    db.add(WebhookEvent(stripe_event_id=event_id))
