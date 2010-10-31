#
# core.py
#
# Copyright (C) 2010 Sam Lai <sam@edgylogic.com>
# Copyright (C) 2009 Andrew Resch <andrewresch@gmail.com>
#
# Basic plugin template created by:
# Copyright (C) 2008 Martijn Voncken <mvoncken@gmail.com>
# Copyright (C) 2007-2009 Andrew Resch <andrewresch@gmail.com>
#
# Deluge is free software.
#
# You may redistribute it and/or modify it under the terms of the
# GNU General Public License, as published by the Free Software
# Foundation; either version 3 of the License, or (at your option)
# any later version.
#
# deluge is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with deluge.    If not, write to:
# 	The Free Software Foundation, Inc.,
# 	51 Franklin Street, Fifth Floor
# 	Boston, MA  02110-1301, USA.
#
#    In addition, as a special exception, the copyright holders give
#    permission to link the code of portions of this program with the OpenSSL
#    library.
#    You must obey the GNU General Public License in all respects for all of
#    the code used other than OpenSSL. If you modify file(s) with this
#    exception, you may extend this exception to your version of the file(s),
#    but you are not obligated to do so. If you do not wish to do so, delete
#    this exception statement from your version. If you delete this exception
#    statement from all source files in the program, then also delete it here.
#

import os
import shutil
import thread

from deluge.log import LOG as log
from deluge.plugins.pluginbase import CorePluginBase
import deluge.component as component
import deluge.configmanager
from deluge.core.rpcserver import export
from deluge.event import DelugeEvent

from twisted.internet import reactor

DEFAULT_PREFS = {
    "copy_to" : "",
    "umask" : ""
}

class TorrentCopiedEvent(DelugeEvent):
    """
    Emitted when a torrent is copied.
    """
    def __init__(self, torrent_id, old_path, new_path, path_pairs):
        """
        :param torrent_id - hash representing torrent in Deluge
        :param old_path - original path for the torrent
        :param new_path - new path for the torrent
        :param path_pairs - a list of tuples, ( old path, new path )
        """
        self._args = [ torrent_id, old_path, new_path, path_pairs ]

class Core(CorePluginBase):
    def enable(self):
        self.config = deluge.configmanager.ConfigManager("copycompleted.conf", DEFAULT_PREFS)

        # validate settings here as an aid to user
        # don't act differently, as this won't be called again if settings are
        # changed during the session.
        if self.config["copy_to"].strip() == "" or not os.path.isdir(self.config["copy_to"]):
            log.error("COPYCOMPLETED: No path to copy to was specified, or that path was invalid. Please amend.")

        # Get notified when a torrent finishes downloading
        component.get("EventManager").register_event_handler("TorrentFinishedEvent", self.on_torrent_finished)

    def disable(self):
        try:
            self.timer.cancel()
        except:
            pass
        component.get("EventManager").deregister_event_handler("TorrentFinishedEvent", self.on_torrent_finished)

    def update(self):
        pass

    def on_torrent_finished(self, torrent_id):
        """
        Copy the torrent now. It will do this in a separate thread to avoid
        freezing up this thread (which causes freezes in the daemon and hence
        web/gtk UI.)
        """
        torrent = component.get("TorrentManager").torrents[torrent_id]
        info = torrent.get_status([ "name", "save_path", "move_on_completed", "move_on_completed_path" ])
        old_path = info["move_on_completed_path"] if info["move_on_completed"] else info["save_path"]
        new_path = self.config["copy_to"]
        files = torrent.get_files()
        umask = self.config["umask"]
        
        # validate parameters
        if new_path.strip() == "" or not os.path.isdir(new_path):
            log.error("COPYCOMPLETED: No path to copy to was specified, or that path was invalid. Copy aborted.")
            return
        
        log.info("COPYCOMPLETED: Copying %s from %s to %s" % (info["name"], old_path, new_path)) 
        thread.start_new_thread(Core._thread_copy, (torrent_id, old_path, new_path, files, umask))

    @staticmethod
    def _thread_copy(torrent_id, old_path, new_path, files, umask):
        # apply different umask if available
        if umask:
            log.debug("COPYCOMPLETED: Applying new umask of octal %s" % umask)
            new_umask = int(umask, 8)
            old_umask = os.umask(new_umask)
        
        path_pairs = [ ]
        for f in files:
            try:
                old_file_path = os.path.join(old_path, f["path"])
                new_file_path = os.path.join(new_path, f["path"])

                # check that this file exists at the current location
                if not os.path.exists(old_file_path):
                    log.debug("COPYCOMPLETED: %s was not downloaded. Skipping." % f["path"])
                    break

                # check that this file doesn't already exist at the new location
                if os.path.exists(new_file_path):
                    log.info("COPYCOMPLETED: %s already exists in the destination. Skipping." % f["path"])
                    break

                log.info("COPYCOMPLETED: Copying %s to %s" % (old_file_path, new_file_path))

                # ensure dirs up to this exist
                if not os.path.exists(os.path.dirname(new_file_path)):
                    os.makedirs(os.path.dirname(new_file_path))

                # copy the file
                shutil.copy2(old_file_path, new_file_path)

                # amend file mode with umask if specified
                if umask:
                    # choose 0666 so execute bit is not set for files
                    os.chmod(new_file_path, (~new_umask & 0666))

                path_pairs.append(( old_file_path, new_file_path ))

            except Exception, e:
                os.error("COPYCOMPLETED: Could not copy file.\n%s" % str(e))

        # revert new umask
        if umask:
            log.debug("COPYCOMPLETED: reverting umask to original")
            os.umask(old_umask)

        component.get("EventManager").emit(TorrentCopiedEvent(torrent_id, old_path, new_path, path_pairs))
            
    @export()
    def set_config(self, config):
        "sets the config dictionary"
        for key in config.keys():
            self.config[key] = config[key]
        self.config.save()

    @export()
    def get_config(self):
        "returns the config dictionary"
        return self.config.config
