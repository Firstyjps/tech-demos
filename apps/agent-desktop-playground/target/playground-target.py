#!/usr/bin/env python3
"""Small GTK 3 window for the agent-desktop playground.

The accessible names are Note (text field) and Ping (button). The status
label's accessible name changes to "Pong: …" when Ping is pressed, so a
fresh snapshot shows the click.
"""

import gi

gi.require_version("Gtk", "3.0")
from gi.repository import GLib, Gtk

GLib.set_prgname("playground-target")
GLib.set_application_name("Playground Target")


class App(Gtk.Window):
    def __init__(self):
        super().__init__(title="Playground Target")
        self.set_default_size(480, 240)
        self.set_position(Gtk.WindowPosition.CENTER)
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        box.set_border_width(16)
        self.add(box)

        self.entry = Gtk.Entry()
        self.entry.get_accessible().set_name("Note")
        box.pack_start(self.entry, False, False, 0)

        button = Gtk.Button(label="Ping")
        button.connect("clicked", self.on_ping)
        box.pack_start(button, False, False, 0)

        self.status = Gtk.Label(label="Waiting")
        self.status.set_xalign(0)
        box.pack_start(self.status, False, False, 0)

    def on_ping(self, _button):
        note = self.entry.get_text().strip()
        self.status.set_text(f"Pong: {note}" if note else "Pong")


win = App()
win.connect("destroy", Gtk.main_quit)
win.show_all()
Gtk.main()
