"""Bot de dudas en Slack (backend/api/slack_bot.py).

Autorización por firma HMAC, no por sesión ni CRON_SECRET -- ver
backend/api/cron.py para el otro caso de "sin sesión" del proyecto.
Gemini y el envío a Slack van mockeados: esto comprueba el enrutado y el
filtrado de eventos, no la calidad de la respuesta ni la red.
"""

import hashlib
import hmac
import json
import os
import time
import unittest
from unittest.mock import patch

os.environ["ADMIN_PASSWORD"] = "test-admin"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)
os.environ["CRON_SECRET"] = "test-cron-secret"
os.environ["SLACK_SIGNING_SECRET"] = "test-signing-secret"

import app  # noqa: E402
import backend.api.slack_bot as slack_bot  # noqa: E402


def _firmar(body: bytes, timestamp: str) -> str:
    base = f"v0:{timestamp}:{body.decode()}"
    return "v0=" + hmac.new(
        "test-signing-secret".encode(), base.encode(), hashlib.sha256
    ).hexdigest()


class SlackBotTests(unittest.TestCase):
    def setUp(self):
        slack_bot._procesados.clear()
        app.app.config["TESTING"] = True
        self.client = app.app.test_client()

    def _post(self, payload: dict, timestamp: str | None = None):
        body = json.dumps(payload).encode()
        timestamp = timestamp or str(int(time.time()))
        firma = _firmar(body, timestamp)
        return self.client.post(
            "/api/slack/events",
            data=body,
            content_type="application/json",
            headers={
                "X-Slack-Request-Timestamp": timestamp,
                "X-Slack-Signature": firma,
            },
        )

    def test_firma_invalida_rechazada(self):
        respuesta = self.client.post(
            "/api/slack/events",
            data=json.dumps({"type": "url_verification", "challenge": "x"}).encode(),
            content_type="application/json",
            headers={"X-Slack-Request-Timestamp": "1", "X-Slack-Signature": "v0=nopo"},
        )
        self.assertEqual(respuesta.status_code, 401)

    def test_verificacion_de_url_devuelve_el_challenge(self):
        respuesta = self._post({"type": "url_verification", "challenge": "abc123"})
        self.assertEqual(respuesta.get_json(), {"challenge": "abc123"})

    def test_mencion_llama_al_llm_y_responde_en_el_hilo_correcto(self):
        payload = {
            "type": "event_callback",
            "event_id": "Ev1",
            "event": {
                "type": "app_mention",
                "text": "<@U123> ¿cómo creo una tarea?",
                "channel": "C1",
                "ts": "111.222",
            },
        }
        with patch.object(slack_bot, "_responder", return_value="Así se crea...") as responder, \
                patch.object(slack_bot, "responder_en_hilo") as enviar:
            respuesta = self._post(payload)

        self.assertEqual(respuesta.status_code, 200)
        responder.assert_called_once_with("¿cómo creo una tarea?")
        enviar.assert_called_once_with("C1", "111.222", "Así se crea...")

    def test_mensaje_de_otro_bot_se_ignora(self):
        payload = {
            "type": "event_callback",
            "event_id": "Ev2",
            "event": {"type": "message", "channel_type": "im", "bot_id": "B1", "text": "hola"},
        }
        with patch.object(slack_bot, "_responder") as responder:
            respuesta = self._post(payload)

        self.assertEqual(respuesta.status_code, 200)
        responder.assert_not_called()

    def test_mensaje_en_canal_sin_mencion_se_ignora(self):
        payload = {
            "type": "event_callback",
            "event_id": "Ev3",
            "event": {"type": "message", "channel_type": "channel", "text": "hola a todos"},
        }
        with patch.object(slack_bot, "_responder") as responder:
            respuesta = self._post(payload)

        self.assertEqual(respuesta.status_code, 200)
        responder.assert_not_called()

    def test_reintento_de_slack_no_reprocesa(self):
        body = json.dumps({"type": "event_callback", "event_id": "Ev4", "event": {}}).encode()
        timestamp = str(int(time.time()))
        respuesta = self.client.post(
            "/api/slack/events",
            data=body,
            content_type="application/json",
            headers={
                "X-Slack-Request-Timestamp": timestamp,
                "X-Slack-Signature": _firmar(body, timestamp),
                "X-Slack-Retry-Num": "1",
            },
        )
        self.assertEqual(respuesta.status_code, 200)

    def test_mismo_event_id_dos_veces_solo_procesa_una(self):
        payload = {
            "type": "event_callback",
            "event_id": "Ev5",
            "event": {"type": "app_mention", "text": "hola", "channel": "C1", "ts": "1"},
        }
        with patch.object(slack_bot, "_responder", return_value="hola") as responder, \
                patch.object(slack_bot, "responder_en_hilo"):
            self._post(payload)
            self._post(payload)

        responder.assert_called_once()


if __name__ == "__main__":
    unittest.main()
