"""Lectura del calendario de Luma (services/luma.py): sin base de datos ni red."""

import unittest
from unittest import mock

from backend.services import luma

ICS = (
    "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:20990101T170000Z\r\n"
    "SUMMARY:Conversaciones Alumni #09 con Ana\\, de Wayra\r\n"
    "DESCRIPTION:Get up-to-date information at: https://luma.com/abc123\\n\\nAd\r\n dress: Sala C\r\n"
    "LOCATION:ETSIT UPM\\, Av. Complutense 30\r\nUID:evt-1@events.lu.ma\r\nEND:VEVENT\r\n"
    "BEGIN:VEVENT\r\nDTSTART:20000101T170000Z\r\nSUMMARY:Pasado\r\nUID:evt-2\r\nEND:VEVENT\r\n"
    "BEGIN:VEVENT\r\nDTSTART:20990102T170000Z\r\nSUMMARY:Enlace raro\r\n"
    "DESCRIPTION:Más en javascript:alert(1)\r\nUID:evt-3\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n"
)


class LumaTestCase(unittest.TestCase):
    def setUp(self):
        luma._cache.update(hasta=0.0, eventos=[])

    def test_parsea_y_filtra_lo_pasado(self):
        respuesta = mock.MagicMock()
        respuesta.__enter__.return_value.read.return_value = ICS.encode()
        with mock.patch("urllib.request.urlopen", return_value=respuesta):
            eventos = luma.eventos_luma()
        self.assertEqual([e["titulo"] for e in eventos], ["Conversaciones Alumni #09 con Ana, de Wayra", "Enlace raro"])
        self.assertEqual(eventos[0]["url"], "https://luma.com/abc123")
        self.assertEqual(eventos[0]["lugar"], "ETSIT UPM")
        self.assertEqual(eventos[1]["url"], "")

    def test_luma_caido_no_rompe_nada(self):
        with mock.patch("urllib.request.urlopen", side_effect=OSError("sin red")):
            self.assertEqual(luma.eventos_luma(), [])


if __name__ == "__main__":
    unittest.main()
