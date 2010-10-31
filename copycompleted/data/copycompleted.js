Ext.ns('Deluge.ux');

Deluge.ux.FileModePreview = Ext.extend(Ext.form.FieldSet, {

	title: _('Resultant Mode Preview'),
	fileMode: '0666',
	dirMode: '0777',
	border: false,

	onRender: function(ct, position) {
		Deluge.ux.FileModePreview.superclass.onRender.call(this, ct, position);
		
		var dom = this.body.dom;
		
		function createEl(parent, type) {
			var el = document.createElement(type);
			parent.appendChild(el);
			return el;
		};
		
		function applyFloat(el, attr) {
			var floatAttr = 'float';
			if (el.style.float == undefined) {
				// for firefox
				if (el.style.cssFloat != undefined) floatAttr = 'cssFloat';
				// for IE
				if (el.style.styleFloat != undefined) floatAttr = 'styleFloat';
			}
			el.style[floatAttr] = attr;
		};
		
		// cache access to cells for easier access later
		this.modeCells = {
			file: {
				u: { },
				g: { },
				o: { }
			},
			dir: {
				u: { },
				g: { },
				o: { }
			}
		};
		
		Ext.each([ { type: 'dir', name: 'Directory', mode: this.dirMode },
			   { type: 'file', name: 'File', mode: this.fileMode } ], function(d) {
			createEl(dom, 'p').appendChild(document.createTextNode(d['name'] + ' (mask applied to ' + d['mode'] + '):'));
			
			var table = createEl(dom, 'table');
			table.cellSpacing = 2;
			table.style.width = '100%';
			
			// ugo headers
			var row = createEl(table, 'tr');
			var label = createEl(row, 'th');
			label.appendChild(document.createTextNode('User'));
			label.colSpan = 3;
			label.style.fontWeight = 'bold';
			label.style.width = '33%';
			
			label = createEl(row, 'th');
			label.appendChild(document.createTextNode('Group'));
			label.colSpan = 3;
			label.style.fontWeight = 'bold';
			label.style.width = '33%';
			
			label = createEl(row, 'th');
			label.appendChild(document.createTextNode('Other'));
			label.colSpan = 3;
			label.style.fontWeight = 'bold';
			label.style.width = '33%';
			
			// bits
			row = createEl(table, 'tr');
			
			Ext.each([ 'u', 'g', 'o'], function (p) {
				var cell = createEl(row, 'td');
				cell.appendChild(document.createTextNode('r'));
				cell.style.textAlign = 'center';
				cell.style.backgroundColor = '#F2F2F2';
				cell.style.width = '11%';
				cell.currentState = 0;
				this.modeCells[d.type][p]['r'] = cell;
				cell = createEl(row, 'td');
				cell.appendChild(document.createTextNode('w'));
				cell.style.textAlign = 'center';
				cell.style.backgroundColor = '#F2F2F2';
				cell.style.width = '11%';
				cell.currentState = 0;
				this.modeCells[d.type][p]['w'] = cell;
				cell = createEl(row, 'td');
				cell.appendChild(document.createTextNode('x'));
				cell.style.textAlign = 'center';
				cell.style.backgroundColor = '#F2F2F2';
				cell.style.width = '11%';
				cell.currentState = 0;
				this.modeCells[d.type][p]['x'] = cell;
			}, this);
			
			// spacer
			createEl(dom, 'div').setAttribute('style', 'height: 10px;');
		}, this);
		
		this.updateCells();
	},
	
	updateCells: function() {
		for (var type in this.modeCells) {
			for (var ugo in this.modeCells[type]) {
				for (var p in this.modeCells[type][ugo]) {
					var el = this.modeCells[type][ugo][p];
					el.style.color = el.currentState ? '#000000' : '#999999';
				}
			}
		}
	},
	
	updatePreview: function(mask) {
		if (mask == '')
			mask = 0;
		
		mask = parseInt(mask, 8);
		
		// for dir
		var r = parseInt(this.dirMode, 8);
		r = (~mask) & r;
		
		this.modeCells['dir']['u']['r'].currentState = parseInt('0100000000', 2) & r;
		this.modeCells['dir']['u']['w'].currentState = parseInt('0010000000', 2) & r;
		this.modeCells['dir']['u']['x'].currentState = parseInt('0001000000', 2) & r;
		
		this.modeCells['dir']['g']['r'].currentState = parseInt('0000100000', 2) & r;
		this.modeCells['dir']['g']['w'].currentState = parseInt('0000010000', 2) & r;
		this.modeCells['dir']['g']['x'].currentState = parseInt('0000001000', 2) & r;
		
		this.modeCells['dir']['o']['r'].currentState = parseInt('0000000100', 2) & r;
		this.modeCells['dir']['o']['w'].currentState = parseInt('0000000010', 2) & r;
		this.modeCells['dir']['o']['x'].currentState = parseInt('0000000001', 2) & r;
		
		// for file
		var r = parseInt(this.fileMode, 8);
		r = (~mask) & r;
		
		this.modeCells['file']['u']['r'].currentState = parseInt('0100000000', 2) & r;
		this.modeCells['file']['u']['w'].currentState = parseInt('0010000000', 2) & r;
		this.modeCells['file']['u']['x'].currentState = parseInt('0001000000', 2) & r;
		
		this.modeCells['file']['g']['r'].currentState = parseInt('0000100000', 2) & r;
		this.modeCells['file']['g']['w'].currentState = parseInt('0000010000', 2) & r;
		this.modeCells['file']['g']['x'].currentState = parseInt('0000001000', 2) & r;
		
		this.modeCells['file']['o']['r'].currentState = parseInt('0000000100', 2) & r;
		this.modeCells['file']['o']['w'].currentState = parseInt('0000000010', 2) & r;
		this.modeCells['file']['o']['x'].currentState = parseInt('0000000001', 2) & r;
		
		this.updateCells();
	}
	
});

Ext.ns('Deluge.ux.preferences');

Deluge.ux.preferences.CopyCompletedPage = Ext.extend(Ext.Panel, {
	
	border: false,
	title: _('Copy Completed'),
	layout: 'fit',
	
	initComponent: function() {
		Deluge.ux.preferences.CopyCompletedPage.superclass.initComponent.call(this);

		Ext.apply(Ext.form.VTypes, {
			umask: function(value, field) {
				// ignore if blank
				if (value == '') return true;
				
				// ensure it is numeric only
				var numberRegExp = /^0[0-7]{3}$/i;
				if (!numberRegExp.test(value)) {
					this.umaskText = 'The umask must be specified in octal format, e.g. 0022.';
					return false;
				}
				
				return true;
			},
			umaskMask: /^[0-7]{0,4}$/i
		});

		this.form = this.add({
			xtype: 'form',
			layout: 'form',
			border: false,
			autoHeight: true
		});
		
		this.copyTo = this.form.add({
			xtype: 'textfield',
			fieldLabel: _('Copy to path'),
			name: 'copy_to',
			allowBlank: false,
			width: 210
		});
		
		this.umask = this.form.add({
			xtype: 'textfield',
			fieldLabel: _('umask (octal)'),
			name: 'umask',
			width: 100,
			maxLength: 4,
			vtype: 'umask',
			enableKeyEvents: true
		});
		this.umask.on('valid', function (field) {
			var value = this.umask.getValue();
			
			// if blank, means use sys umask, so don't preview
			if (value == '') {
				this.umaskPreview.hide();
			}
			else {
				this.umaskPreview.show();
				this.umaskPreview.updatePreview(value);
			}
		}, this);
		this.umask.on('invalid', function (field) {
			this.umaskPreview.hide();
		}, this);
		
		this.umaskPreview = this.form.add(new Deluge.ux.FileModePreview());
		
		this.form.add({
			xtype: 'box',
			autoEl: {
				cn: '<p>The umask needs to be specified as an octal, e.g. 0022.<br /><br />' +
				    'If you are not familiar with this format, have a look at the <a href="http://en.wikipedia.org/wiki/Umask#Octal_umasks">Wikipedia article</a>.<br /><br />' +
				    'To use the standard system user umask, leave this field blank.</p>'
			}
		});
		
		
	},
	
	onRender: function(ct, position) {
		Deluge.ux.preferences.CopyCompletedPage.superclass.onRender.call(this, ct, position);
		this.form.layout = new Ext.layout.FormLayout();
		this.form.layout.setContainer(this);
		this.form.doLayout();
	},
	
	onApply: function() {
		// build settings object
		var config = { }
		
		config['copy_to'] = this.copyTo.getValue();
		config['umask'] = this.umask.getValue();
		
		deluge.client.copycompleted.set_config(config);
	},
	
	afterRender: function() {
		Deluge.ux.preferences.CopyCompletedPage.superclass.afterRender.call(this);
		this.updateConfig();
	},
	
	updateConfig: function() {
		deluge.client.copycompleted.get_config({
			success: function(config) {
				this.copyTo.setValue(config['copy_to']);
				this.umask.setValue(config['umask']);
			},
			scope: this
		});
	}
});

Deluge.plugins.CopyCompletedPlugin = Ext.extend(Deluge.Plugin, {
	
	name: 'CopyCompleted',
	
	onDisable: function() {
		// use LOWERCASE for deluge.preferences to get the instance
		// of PreferencesWindow, instead of the class.
		deluge.preferences.removePage(this.prefsPage);
	},
	
	onEnable: function() {
		this.prefsPage = deluge.preferences.addPage(new Deluge.ux.preferences.CopyCompletedPage());
	}
});

Deluge.registerPlugin('CopyCompleted', Deluge.plugins.CopyCompletedPlugin);