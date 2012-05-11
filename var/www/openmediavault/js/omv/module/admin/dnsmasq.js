/**
 * vim: tabstop=4
 *
 * @license    http://www.gnu.org/licenses/gpl.html GPL Version 3
 * @author     Ian Moore <imooreyahoo@gmail.com>
 * @author     Marcel Beck <marcel.beck@mbeck.org>
 * @copyright  Copyright (c) 2011 Ian Moore
 * @copyright  Copyright (c) 2012 Marcel Beck
 *
 * This file is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This file is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this file. If not, see <http://www.gnu.org/licenses/>.
 *
 */
	// require("js/omv/NavigationPanel.js")
	// require("js/omv/data/DataProxy.js")
	// require("js/omv/FormPanelExt.js")
	// require("js/omv/form/PasswordField.js")
	// require("js/omv/form/plugins/FieldInfo.js")
	// require("js/omv/module/admin/Logs.js")
	// require("js/omv/util/Format.js")
	// require("js/omv/grid/TBarGridPanel.js")
	// require("js/omv/CfgObjectDialog.js")

Ext.ns("OMV.Module.Services");

// Register the menu.
OMV.NavigationPanelMgr.registerMenu("services", "dnsmasq", {
	text    :_("Local DNS / DHCP"),
	icon    :"images/dnsmasq.png",
	position:1000
});

/**
 * Main Settings panel
 */
OMV.Module.Services.DNSMasqSettingsPanel = function (config)
{
	var initialConfig = {
		rpcService:"dnsmasq"
	};
	Ext.apply(initialConfig, config);
	OMV.Module.Services.DNSMasqSettingsPanel.superclass.constructor.call(this, initialConfig);
};

Ext.extend(OMV.Module.Services.DNSMasqSettingsPanel, OMV.FormPanelExt, {
	initComponent:function ()
	{
		OMV.Module.Services.DNSMasqSettingsPanel.superclass.initComponent.apply(this, arguments);
		this.on("load", this._updateFormFields, this);
	},

	getFormItems:function ()
	{
		return [
			{
				xtype   :"fieldset",
				title   :_("General"),
				defaults:{
					labelSeparator:""
				},
				items   :[
					{
						xtype     :"checkbox",
						name      :"enable",
						fieldLabel:_("Enable"),
						checked   :false,
						inputValue:1,
						listeners :{
							check:this._updateFormFields,
							scope:this
						}
					},
					{
						xtype     :"textfield",
						name      :"domain-name",
						fieldLabel:_("Domain Name"),
						allowBlank:true,
						value     :"local",
						width     :200,
						plugins   :[ OMV.form.plugins.FieldInfo ],
						infoText  :_("Configures local DNS entries to contain the domain name above. Also sets the domain for DHCP clients.")
					}
				]
			},
			{
				xtype   :"fieldset",
				title   :"DNS Settings",
				defaults:{
					labelSeparator:""
				},
				items   :[
					{
						html:_("The local DNS server will respond to DNS queries for the hosts specified on the Static Entries tab, (optionally) hosts learned through OpenMediaVault's WINS server, and (optionally) DHCP clients that send their host name in DHCP requests. DNS requests for unknown hosts are forwarded to the OpenMediaVault's DNS servers as configured in System -> Network -> DNS Server.<br /><br />")
					},
					{
						xtype     :"checkbox",
						name      :"dns-log-queries",
						fieldLabel:_("Log Queries"),
						boxLabel  :_("For debugging purposes, log each DNS query"),
						checked   :false,
						inputValue:1
					},
					{
						xtype     :"checkbox",
						name      :"dns-wins",
						fieldLabel:_("Use WINS entries"),
						boxLabel  :_("Use IP / name entries obtained through WINS server."),
						plugins   :[ OMV.form.plugins.FieldInfo ],
						infoText  :_("Requires that Enable WINS server is set in Services -> SMB/CIFS"),
						checked   :false,
						inputValue:1
					}
				]
			},
			{
				xtype   :"fieldset",
				title   :_("DHCP Settings"),
				defaults:{
					labelSeparator:""
				},
				items   :[
					{
						xtype     :"checkbox",
						name      :"dhcp-enable",
						fieldLabel:_("Enable"),
						checked   :false,
						inputValue:1,
						listeners :{
							check:this._updateFormFields,
							scope:this
						}
					},
					{
						xtype     :"checkbox",
						name      :"log-dhcp",
						fieldLabel:_("Log DHCP"),
						boxLabel  :_("Log lots of extra information about DHCP transactions."),
						checked   :false,
						inputValue:1
					},
					{
						xtype        :"combo",
						name         :"network",
						hiddenName   :"network",
						fieldLabel   :_("Lease Network"),
						emptyText    :_("Select a network ..."),
						allowBlank   :false,
						allowNone    :false,
						width        :300,
						editable     :false,
						triggerAction:"all",
						displayField :"netid",
						valueField   :"netid",
						store        :new OMV.data.Store({
																							 remoteSort:false,
																							 proxy     :new OMV.data.DataProxy({"service":"dnsmasq", "method":"getNetworks"}),
																							 reader    :new Ext.data.JsonReader({
																																										idProperty:"netid",
																																										fields    :[
																																											{ name:"netid" }
																																										]
																																									})
																						 })
					},
					{
						xtype     :"textfield",
						name      :"gateway",
						fieldLabel:_("Gateway"),
						vtype     :"IPv4",
						allowBlank:true,
						value     :""
					},
					{
						xtype     :"textfield",
						name      :"first-ip",
						fieldLabel:_("First IP address"),
						vtype     :"IPv4",
						allowBlank:true,
						value     :""
					},
					{
						xtype     :"textfield",
						name      :"last-ip",
						vtype     :"IPv4",
						fieldLabel:_("Last IP address"),
						allowBlank:true,
						value     :""
					},
					{
						xtype        :"combo",
						name         :"default-lease-time",
						fieldLabel   :_("Lease Time"),
						allowBlank   :false,
						displayField :"text",
						valueField   :"value",
						value        :"24h",
						triggerAction:"all",
						mode         :"local",
						store        :new Ext.data.SimpleStore({
																										 fields:[ "value", "text" ],
																										 data  :[
																											 ["1h", _("1 hour")],
																											 ["3h", _("3 hours")],
																											 ["6h", _("6 hours")],
																											 ["12h", _("12 hours")],
																											 ["24h", _("1 day")],
																											 ["48h", _("2 days")],
																											 ["96h", _("4 days")],
																											 ["168h", _("1 week")]
																										 ]
																									 })
					},
					{
						xtype     :"textfield",
						name      :"dns-domains",
						fieldLabel:_("DNS Search Domain(s)"),
						allowBlank:true,
						width     :300,
						value     :"",
						plugins   :[ OMV.form.plugins.FieldInfo ],
						infoText  :_("Separate multiple entries with commas.")
					},
					{
						xtype     :"textfield",
						name      :"wins-servers",
						fieldLabel:_("WINS Server(s)"),
						allowBlank:true,
						width     :300,
						value     :"",
						plugins   :[ OMV.form.plugins.FieldInfo ],
						infoText  :_("Separate multiple entries with commas.")
					},
					{
						xtype     :"textfield",
						name      :"ntp-servers",
						fieldLabel:_("NTP Server(s)"),
						allowBlank:true,
						width     :300,
						value     :"",
						plugins   :[ OMV.form.plugins.FieldInfo ],
						infoText  :_("Separate multiple entries with commas.")
					},
					{
						xtype     :"textfield",
						name      :"bootfile",
						fieldLabel:_("TFTP Boot File"),
						allowBlank:true,
						width     :300,
						value     :"",
						plugins   :[ OMV.form.plugins.FieldInfo ],
						infoText  :_("If set, this file must exist on the TFTP share.")
					}
				]
			},
			{
				xtype:"fieldset",
				title:_("Extra Options"),
				items:[
					{
						xtype     :"textfield",
						name      :"extraoptions",
						hideLabel :true,
						allowBlank:true,
						autoCreate:{
							tag         :"textarea",
							autocomplete:"off",
							rows        :"5",
							cols        :"80"
						},
						plugins   :[ OMV.form.plugins.FieldInfo ],
						infoText  :_("Extra options for dnsmasq configuration file.")
					}
				]
			}
		];
	},

	/**
	 * Private function to update the states of various form fields.
	 */
	_updateFormFields:function ()
	{

		// Enabled / disabled fields
		var checked = this.findFormField("enable").checked;
		var dhcpen = this.findFormField("dhcp-enable");

		this.findFormField("domain-name").allowBlank = !(checked);
		var dchecked = dhcpen.checked;
		var fields = ["network", "gateway", "first-ip", "last-ip"];
		for (var i = 0; i < fields.length; i++)
		{
			this.findFormField(fields[i]).allowBlank = !dchecked;
			if (!dchecked)
			{
				this.findFormField(fields[i]).clearInvalid();
			}
		}

		// Enable / disable tabs
		Ext.getCmp('DNSMasqEntriesGridPanel').setDisabled(!checked);
		Ext.getCmp('DNSMasqLeasesGridPanel').setDisabled(!dchecked);

		// Hide MAC address column if DHCP is not enabled
		var colConfig = [
			{
				header   :_("Host Name"),
				sortable :true,
				dataIndex:"name"
			},
			{
				header   :_("IP Address"),
				sortable :true,
				dataIndex:"ip"
			},
			{
				header   :_("Other Names"),
				sortable :true,
				dataIndex:"cnames"
			},
			{
				header   :_("MAC Address"),
				id       :'DNSMasqEntriesGridPanelMacColumn',
				dataIndex:"mac",
				sortable :true
			}
		];

		if (!dchecked)
		{
			colConfig.pop();
		}
		Ext.getCmp('DNSMasqEntriesGridPanel').getColumnModel().setConfig(colConfig);

	}

});

/**
 *
 * Static entries grid
 */
OMV.Module.Services.DNSMasqEntriesGridPanel = function (config)
{

	var initialConfig = {
		disabled         :true,
		id               :'DNSMasqEntriesGridPanel',
		hidePagingToolbar:false,
		colModel         :new Ext.grid.ColumnModel({
																								 columns:[
																									 {
																										 header   :_("Host Name"),
																										 sortable :true,
																										 dataIndex:"name"
																									 },
																									 {
																										 header   :_("IP Address"),
																										 sortable :true,
																										 dataIndex:"ip"
																									 },
																									 {
																										 header   :_("Other Names"),
																										 sortable :true,
																										 dataIndex:"cnames"
																									 },
																									 {
																										 header  :_("MAC Address"),
																										 sortable:true
																									 }
																								 ]
																							 })
	};
	Ext.apply(initialConfig, config);
	OMV.Module.Services.DNSMasqEntriesGridPanel.superclass.constructor.call(this, initialConfig);
};

Ext.extend(OMV.Module.Services.DNSMasqEntriesGridPanel, OMV.grid.TBarGridPanel, {

	initComponent:function ()
	{
		this.store = new OMV.data.Store({
																			autoLoad  :false,
																			remoteSort:false,
																			proxy     :new OMV.data.DataProxy({"service":"dnsmasq", "method":"getEntries"}),
																			reader    :new Ext.data.JsonReader({
																																					 idProperty   :"uuid",
																																					 totalProperty:"total",
																																					 root         :"data",
																																					 fields       :[
																																						 { name:"uuid" },
																																						 { name:"name" },
																																						 { name:"cnames" },
																																						 { name:"ip" },
																																						 { name:"mac" }
																																					 ]
																																				 })
																		});
		OMV.Module.Services.DNSMasqEntriesGridPanel.superclass.initComponent.apply(this, arguments);
	},

	listeners:{
		show:function ()
		{
			this.doLoad();
		}
	},

	initToolbar:function ()
	{
		var tbar = OMV.Module.Services.DNSMasqEntriesGridPanel.superclass.initToolbar.apply(this);
		return tbar;
	},

	cbAddBtnHdl:function ()
	{
		var wnd = new OMV.Module.Services.DNSMasqEntryPropertyDialog({
																																	 uuid     :OMV.UUID_UNDEFINED,
																																	 listeners:{
																																		 submit:function ()
																																		 {
																																			 this.doReload();
																																		 },
																																		 scope :this
																																	 }
																																 });
		wnd.show();
	},

	cbEditBtnHdl:function ()
	{
		var record = this.getSelectionModel().getSelected();
		var wnd = new OMV.Module.Services.DNSMasqEntryPropertyDialog({
																																	 uuid     :record.get("uuid"),
																																	 listeners:{
																																		 submit:function ()
																																		 {
																																			 this.doReload();
																																		 },
																																		 scope :this
																																	 }
																																 });
		wnd.show();
	},

	cbSelectionChangeHdl:function (model)
	{
		OMV.Module.Services.DNSMasqEntriesGridPanel.superclass.cbSelectionChangeHdl.apply(this, arguments);
	},

	doDeletion:function (record)
	{
		OMV.Ajax.request(this.cbDeletionHdl, this, "dnsmasq", "removeEntry", {uuid:record.get("uuid") });
	}


});

/**
 *
 * DHCP leases grid
 */
OMV.Module.Services.DNSMasqLeasesGridPanel = function (config)
{

	var initialConfig = {
		id               :'DNSMasqLeasesGridPanel',
		disabled         :true,
		hideAdd          :true,
		hideEdit         :true,
		hideDelete       :true,
		hideRefresh      :false,
		hidePagingToolbar:false,
		colModel         :new Ext.grid.ColumnModel({
																								 columns:[
																									 {
																										 header   :_("Computer Name"),
																										 sortable :true,
																										 dataIndex:"name",
																										 id       :"name"
																									 },
																									 {
																										 header   :_("IP Address"),
																										 sortable :true,
																										 dataIndex:"ip",
																										 id       :"ip"
																									 },
																									 {
																										 header   :_("MAC Address"),
																										 sortable :true,
																										 dataIndex:"mac",
																										 id       :"mac"
																									 },
																									 {
																										 header   :_("Expires"),
																										 sortable :true,
																										 dataIndex:"exp",
																										 id       :"exp"
																									 }
																								 ]
																							 })
	};
	Ext.apply(initialConfig, config);
	OMV.Module.Services.DNSMasqLeasesGridPanel.superclass.constructor.call(this, initialConfig);
};

Ext.extend(OMV.Module.Services.DNSMasqLeasesGridPanel, OMV.grid.TBarGridPanel, {

	initComponent:function ()
	{
		this.store = new OMV.data.Store({
																			autoLoad  :false,
																			remoteSort:false,
																			proxy     :new OMV.data.DataProxy({"service":"dnsmasq", "method":"getLeaseList"}),
																			reader    :new Ext.data.JsonReader({
																																					 idProperty   :"ip",
																																					 totalProperty:"total",
																																					 root         :"data",
																																					 fields       :[
																																						 { name:"name" },
																																						 { name:"ip" },
																																						 { name:"exp" },
																																						 { name:"mac" }
																																					 ]
																																				 })
																		});
		OMV.Module.Services.DNSMasqLeasesGridPanel.superclass.initComponent.apply(this, arguments);
	},

	listeners:{
		show:function ()
		{
			this.doLoad();
		}
	},

	initToolbar:function ()
	{
		var tbar = OMV.Module.Services.DNSMasqLeasesGridPanel.superclass.initToolbar.apply(this);
		return tbar;
	}


});

OMV.NavigationPanelMgr.registerPanel("services", "dnsmasq", {
	cls     :OMV.Module.Services.DNSMasqSettingsPanel,
	position:10,
	title   :_("Settings")
});

OMV.NavigationPanelMgr.registerPanel("services", "dnsmasq", {
	cls     :OMV.Module.Services.DNSMasqEntriesGridPanel,
	position:20,
	title   :_("Static Entries")
});

OMV.NavigationPanelMgr.registerPanel("services", "dnsmasq", {
	cls     :OMV.Module.Services.DNSMasqLeasesGridPanel,
	position:30,
	title   :_("Leases")
});

/**
 * Static entry property dialog
 */
OMV.Module.Services.DNSMasqEntryPropertyDialog = function (config)
{
	var initialConfig = {
		rpcService  :"dnsmasq",
		rpcGetMethod:"getEntry",
		rpcSetMethod:"setEntry",
		title       :((config.uuid == OMV.UUID_UNDEFINED) ? _("Add Static DNS and/or DHCP Entry") : _("Edit Static DNS and/or DHCP Entry")),
		autoHeight  :true,
		width       :530,
		height      :300
	};
	Ext.apply(initialConfig, config);
	OMV.Module.Services.DNSMasqEntryPropertyDialog.superclass.constructor.call(
					this, initialConfig);
};

Ext.extend(OMV.Module.Services.DNSMasqEntryPropertyDialog, OMV.CfgObjectDialog, {
	initComponent:function ()
	{
		OMV.Module.Services.DNSMasqEntryPropertyDialog.superclass.initComponent.apply(this, arguments);
	},

	// Override validation
	isValid      :function ()
	{

		if (OMV.Module.Services.DNSMasqEntryPropertyDialog.superclass.isValid.call(this))
		{

			var values = this.getValues();

			if (!(values['name'] || values['mac']))
			{
				OMV.MessageBox.error(null, _("This entry is useless without specifying a Host Name or MAC address."));
				return false;
			}

		}
		else
		{
			return false;
		}

		return true;
	},

	getFormConfig:function ()
	{
		return {
			autoHeight:true
		};
	},

	getFormItems:function ()
	{
		return [
			{
				html:_("To create a DNS entry, specify IP address and Host Name. Optionally, you may enter other names which  the host should be known as.<br /><br />")
			},
			{
				hidden:Ext.getCmp('DNSMasqLeasesGridPanel').disabled,
				html  :_("Specifying a MAC Address and IP Address will create a static IP DHCP entry.<br /><br />Entering all fields will create an all-in-one static ip reservation and DNS entry.<br /><br />")
			},
			{
				xtype     :"textfield",
				name      :"name",
				vtype     :"dnsmasqhostname",
				itemId    :"name",
				fieldLabel:_("Host Name"),
				allowBlank:(!Ext.getCmp('DNSMasqLeasesGridPanel').disabled),
				plugins   :[ OMV.form.plugins.FieldInfo ],
				infoText  :(Ext.getCmp('DNSMasqLeasesGridPanel').disabled ? '' :
										_("If this field is left blank, the host name will be obtained from the client's DHCP request. Beware that not all clients send their host name."))
			},
			{
				xtype     :"textfield",
				name      :"cnames",
				fieldLabel:_("Other Names"),
				allowBlank:true,
				vtype     :"dnsmasqcnames",
				plugins   :[ OMV.form.plugins.FieldInfo ],
				infoText  :_("Other host names that should resolve to the specified IP address. Separate multiple entries with commas.")
			},
			{
				xtype     :"textfield",
				name      :"ip",
				itemId    :'ip',
				vtype     :"IPv4Net",
				fieldLabel:_("IP Address"),
				allowBlank:false
			},
			{
				xtype     :"textfield",
				name      :"mac",
				itemId    :"mac",
				id        :this.getId() + '-mac',
				fieldLabel:_("MAC Address"),
				allowBlank:true,
				hidden    :Ext.getCmp('DNSMasqLeasesGridPanel').disabled
			},
			{
				xtype        :"combo",
				name         :"exlease",
				submitValue  :false,
				hidden       :(this.uuid !== OMV.UUID_UNDEFINED || Ext.getCmp('DNSMasqLeasesGridPanel').disabled),
				fieldLabel   :"",
				emptyText    :_("Select existing lease ..."),
				allowBlank   :true,
				allowNone    :true,
				width        :300,
				editable     :false,
				triggerAction:"all",
				displayField :"disp",
				valueField   :"mac",
				listeners    :{
					select:function (a, b, c)
					{
						this.ownerCt.getComponent('ip').setValue(b.data.ip);
						this.ownerCt.getComponent('mac').setValue(b.data.mac);
						this.ownerCt.getComponent('name').setValue(b.data.name);
					}
				},
				store        :new OMV.data.Store({
																					 remoteSort:false,
																					 proxy     :new OMV.data.DataProxy({"service":"dnsmasq", "method":"getLeases"}),
																					 reader    :new Ext.data.JsonReader({
																																								idProperty:"mac",
																																								fields    :[
																																									{ name:"ip" },
																																									{ name:"mac" },
																																									{ name:"name" },
																																									{ name:"disp" }
																																								]
																																							})
																				 })
			}
		];
	}
});

/**
 * Strict hostname entry. No FQDN
 */
Ext.apply(Ext.form.VTypes, {

	dnsmasqhostname    :function (v)
	{
		return /^[a-zA-Z]([-a-zA-Z0-9]){0,61}[a-zA-Z0-9]$/.test(v);
	},
	dnsmasqhostnameText:_("Invalid hostname"),
	dnsmasqhostnameMask:/[a-z0-9\-]/i,

	dnsmasqcnames    :function (v)
	{
		return /^([a-zA-Z]([-a-zA-Z0-9]){0,61}[a-zA-Z0-9]\s*,\s*)*\s*[a-zA-Z]([-a-zA-Z0-9]){0,61}[a-zA-Z0-9]\s*$/.test(v);
	},
	dnsmasqcnamesText:_("Invalid hostname"),
	dnsmasqcnamesMask:/[a-z0-9\-, ]/i

});

/**
 * @class OMV.Module.Diagnostics.LogPlugin.dnsmasq
 * @derived OMV.Module.Diagnostics.LogPlugin
 * Class that implements the 'dnsmasq' log file diagnostics plugin
 */
OMV.Module.Diagnostics.LogPlugin.dnsmasq = function (config)
{
	var initialConfig = {
		title    :_("Local DNS"),
		stateId  :"c9d06952-00da-11e1-aa29-dnsmasq",
		columns  :[
			{
				header   :_("Date & Time"),
				sortable :true,
				dataIndex:"date",
				id       :"date",
				width    :20,
				renderer :OMV.util.Format.localeTimeRenderer()
			},
			{
				header   :_("Event"),
				sortable :true,
				dataIndex:"event",
				id       :"event"
			}
		],
		rpcArgs  :"dnsmasq",
		rpcFields:[
			{ name:"date" },
			{ name:"event" }
		]
	};
	Ext.apply(initialConfig, config);
	OMV.Module.Diagnostics.LogPlugin.dnsmasq.superclass.constructor.call(this, initialConfig);
};
Ext.extend(OMV.Module.Diagnostics.LogPlugin.dnsmasq, OMV.Module.Diagnostics.LogPlugin, {});
OMV.preg("log", "dnsmasq", OMV.Module.Diagnostics.LogPlugin.dnsmasq);

/**
 * @class OMV.Module.Diagnostics.LogPlugin.dnsmasq-dhcp
 * @derived OMV.Module.Diagnostics.LogPlugin
 * Class that implements the 'dnsmasq-dhcp' log file diagnostics plugin
 */
OMV.Module.Diagnostics.LogPlugin.dnsmasqdhcp = function (config)
{
	var initialConfig = {
		title    :_("DHCP"),
		stateId  :"c9d06952-00da-11e1-aa29-dnsmasq-dhcp",
		columns  :[
			{
				header   :_("Date & Time"),
				sortable :true,
				dataIndex:"date",
				id       :"date",
				width    :20,
				renderer :OMV.util.Format.localeTimeRenderer()
			},
			{
				header   :_("Event"),
				sortable :true,
				dataIndex:"event",
				id       :"event"
			}
		],
		rpcArgs  :"dnsmasq-dhcp",
		rpcFields:[
			{ name:"date" },
			{ name:"event" }
		]
	};
	Ext.apply(initialConfig, config);
	OMV.Module.Diagnostics.LogPlugin.dnsmasqdhcp.superclass.constructor.call(this, initialConfig);
};
Ext.extend(OMV.Module.Diagnostics.LogPlugin.dnsmasqdhcp, OMV.Module.Diagnostics.LogPlugin, {});
OMV.preg("log", "dnsmasq-dhcp", OMV.Module.Diagnostics.LogPlugin.dnsmasqdhcp);
