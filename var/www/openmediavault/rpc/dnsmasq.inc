<?php
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

require_once("openmediavault/object.inc");
require_once("openmediavault/error.inc");
require_once("openmediavault/util.inc");
require_once("openmediavault/rpc.inc");
require_once("openmediavault/notify.inc");

class DNSMasqRpc extends OMVRpc {

	const xpathRoot = '//services/dnsmasq';

	public function __construct()
	{

		$this->methodSchemata = array(

			"set"          => array(
				'{
				"type":"object",
				"properties":{
					"enable":{"type":"boolean"},
					"dns-log-queries":{"type":"boolean"},
					"dhcp-enable":{"type":"boolean"},
					"dns-wins":{"type":"boolean"},
					"log-dhcp":{"type":"boolean"},
					"domain-name":{"type":"string", "optional":true},
					"bootfile":{"type":"string","optional":true},
					"gateway":{"type":"string"},
					"default-lease-time":{"type":"string"},
					"ntp-servers":{"type":"string","optional":true},
					"dns-domains":{"type":"string","optional":true},
					"wins-servers":{"type":"string","optional":true},
					"network":{"type":"string"},
					"first-ip":{"type":"string"},
					"last-ip":{"type":"string"},
					"extraoptions":{"type":"string","optional":true}
				}
			}'
			),
			"getEntries"   => array(
				'{
					"type":"object",
					"properties":{
						"start":{"type":"integer"},
						"limit":{' . $GLOBALS['OMV_JSONSCHEMA_COUNTFIELD'] . '},
						"sortfield":{' . $GLOBALS['OMV_JSONSCHEMA_SORTFIELD'] . '},
						"sortdir":{' . $GLOBALS['OMV_JSONSCHEMA_SORTDIR'] . '}
					}
				}'
			),
			"getLeaseList" => array(
				'{
					"type":"object",
					"properties":{
						"start":{"type":"integer"},
						"limit":{' . $GLOBALS['OMV_JSONSCHEMA_COUNTFIELD'] . '},
						"sortfield":{' . $GLOBALS['OMV_JSONSCHEMA_SORTFIELD'] . '},
						"sortdir":{' . $GLOBALS['OMV_JSONSCHEMA_SORTDIR'] . '}
					}
				}'
			),
			"setEntry"     => array(
				'{
				"type":"object",
				"properties":{
					"uuid":{' . $GLOBALS['OMV_JSONSCHEMA_UUID_UNDEFINED'] . '},
					"ip":{"type":"string","format":"regex","pattern":"\/^(([0-9]{1,3}\\\.){3}[0-9]{1,3}|)$\/i","optional":true},
					"name":{"type":"string","optional":true},
					"cnames":{"type":"string","optional":true},
					"mac":{"type":"string","format":"regex","pattern":"\/^((([a-f0-9]{2}:){5}[a-f0-9]{2})|)$\/i","optional":true}
				}
			}'
			),
			"getEntry"     => array(
				'{
					"type":"object",
					"properties":{
						"uuid":{' . $GLOBALS['OMV_JSONSCHEMA_UUID_UNDEFINED'] . '}
					}
				}'
			),
			"removeEntry"  => array(
				'{
					"type":"object",
					"properties":{
						"uuid":{' . $GLOBALS['OMV_JSONSCHEMA_UUID_UNDEFINED'] . '}
					}
				}'
			)

		);
	}

	/**
	 * Safe config getting amd setting
	 */
	public function __call($name, $args)
	{

		// Configuration methods
		if (substr($name, 0, 6) == 'config')
		{

			// Correct method name
			$name    = substr($name, 6);
			$name[0] = strtolower($name[0]);

			global $xmlConfig;
			$object = call_user_func_array(array($xmlConfig, $name), $args);
			switch ($name)
			{
				case 'delete':
					if ($object === false)
					{
						throw new OMVException(OMVErrorMsg::E_CONFIG_OBJECT_NOT_FOUND, $args[0]);
					}
					break;
				case 'save':
					if ($object === false)
					{
						throw new OMVException(OMVErrorMsg::E_CONFIG_SAVE_FAILED, $xmlConfig->getError());
					}
					break;
				case 'set':
				case 'replace':
				if ($object === false)
				{
					throw new OMVException(OMVErrorMsg::E_CONFIG_SET_OBJECT_FAILED);
				}
					break;
				default:
					if (is_null($object))
					{
						throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED, $args[0]);
					}
			}

			return $object;

		}
		throw new Exception("Method " . __CLASS__ . "::" . $name . " does not exist.");
	}

	/**
	 * Verify that the current user is an admin, and validate method args
	 */
	function _validate($mname = '', $args = array())
	{

		// Check permissions
		$this->validateSession();
		if (!$this->hasRole(OMV_ROLE_ADMINISTRATOR))
		{
			throw new OMVException(OMVErrorMsg::E_RPC_SERVICE_INVALID_PERMISSION);
		}
		$this->commitSession();

		// Check incoming data
		if ($mname)
		{
			$this->validateParams($mname, $args);
		}
	}

	/**
	 * Get all configuration data for service.
	 *
	 * @return array configuration data
	 */
	function get()
	{

		// Validation
		$this->_validate();

		//Get configuration object
		$object = $this->configGet(self::xpathRoot);

		return $object;
	}

	/**
	 * Set configuration data for service.
	 *
	 * @param $object array configuration data
	 */
	function set($data)
	{

		// Validation
		$this->_validate(__METHOD__, func_get_args());

		$oldconf = $this->configGet(self::xpathRoot);
		$object  = array_merge($oldconf, $data);

		foreach (array('enable', 'dhcp-enable', 'dns-log-queries', 'log-dhcp', 'dns-wins') as $k)
		{
			$object[$k] = array_boolval($data, $k);
		}

		// DHCP isn't enabled if dnsmasq isn't enabled
		$object['dhcp-enable'] = ($object['enable'] && $object['dhcp-enable']);

		// Check DHCP networks	
		if ($object['enable'] && $object['dhcp-enable'])
		{

			list($subnet, $netmask) = explode(' / ', $object['network']);

			# Check that gateway, first ip, and last ip are in range
			if (long2ip(ip2long($object['gateway']) & ip2long($netmask)) != $subnet)
			{
				throw new Exception("Gateway address {$object['gateway']} is not in network.");
			}

			if (long2ip(ip2long($object['first-ip']) & ip2long($netmask)) != $subnet)
			{
				throw new Exception("First IP address {$object['first-ip']} is not in network.");
			}

			if (long2ip(ip2long($object['last-ip']) & ip2long($netmask)) != $subnet)
			{
				throw new Exception("Last IP address {$object['last-ip']} is not in network.");
			}

		}

		// Set configuration object
		$this->configReplace(self::xpathRoot, $object);

		$this->configSave();

		// Notify general configuration changes
		$dispatcher = &OMVNotifyDispatcher::getInstance();
		$dispatcher->notify(OMV_NOTIFY_MODIFY,
												"org.openmediavault.services.dnsmasq", $object, $oldconf);

	}

	/**
	 * Remove Entry from config
	 *
	 * @param string $uuid configuration uuid of Entry
	 */
	public function removeEntry($uuid)
	{

		// Validation
		$this->_validate(__METHOD__, func_get_args());

		// Get configuration object for notification
		$object = $this->configGet(self::xpathRoot . "/entries/entry[uuid='{$uuid}']");

		// Delete configuration object
		$this->configDelete(self::xpathRoot . "/entries/entry[uuid='{$uuid}']");

		// Save configuration
		$this->configSave();

		// Notify configuration changes
		$dispatcher = &OMVNotifyDispatcher::getInstance();
		$dispatcher->notify(OMV_NOTIFY_DELETE,
												"org.openmediavault.services.dnsmasq.entries.entry", $object, array());
	}

	/**
	 * Get list of Entries
	 *
	 * @param $start     integer start point in paging list
	 * @param $count     integer number of objects to return in paged list
	 * @param $sortField string field to sort on
	 * @param $sortDir   integer sort direction
	 *
	 * @return array list of Entries
	 */
	public function getEntries($data)
	{

		// Validation
		$this->_validate(__METHOD__, func_get_args());

		$objects = $this->configGetList(self::xpathRoot . "/entries/entry");

		// Filter result
		return $this->applyFilter($objects, $data['start'], $data['limit'], $data['sortfield'], $data['sortdir']);

	}

	/**
	 * Save Entry configuration data
	 *
	 * @param $data array Entry configuration
	 */
	public function setEntry($data)
	{

		// Validation
		$this->_validate(__METHOD__, func_get_args());

		// Prepare configuration data
		$object         = $data;
		$object['uuid'] = ($data['uuid'] == $GLOBALS['OMV_UUID_UNDEFINED']) ? OMVUtil::uuid() : $data['uuid'];

		foreach (array('mac', 'cnames', 'name') as $k)
		{
			if (!empty($k))
			{
				$object[$k] = strtolower($object[$k]);
			}
		}

		// Check uniqueness
		if (!empty($object['name']) && TRUE === $this->configExists(self::xpathRoot . "/entries/entry[name='{$object['name']}']"))
		{
			$ex = $this->configGet(self::xpathRoot . "/entries/entry[name='{$object['name']}']");
			if ($ex['uuid'] != $object['uuid'] && $ex['ip'] == $data['ip'])
			{
				throw new OMVException(OMVErrorMsg::E_CONFIG_OBJECT_UNIQUENESS);
			}
		}

		// Check uniqueness
		if (!empty($data['mac']) && TRUE === $this->configExists(self::xpathRoot . "/entries/entry[ip='{$object['ip']}']"))
		{
			$ex = $this->configGet(self::xpathRoot . "/entries/entry[ip='{$object['ip']}']");
			if ($ex['uuid'] != $object['uuid'] && $ex['mac'] == $data['mac'])
			{
				throw new OMVException(OMVErrorMsg::E_CONFIG_OBJECT_UNIQUENESS);
			}
		}

		// CNAMES must be unique
		if (!empty($object['cnames']))
		{

			$cnames = str_replace(array(" ", "'", '"', '/', '\\'), '', trim($object['cnames']));
			$cnames = preg_replace('/\s*,\s*/', ', ', $cnames);
			$cnames = array_unique(explode(', ', $cnames));

			foreach ($cnames as $cname)
			{

				// check for exact name
				try
				{
					$ex = $this->configGet(self::xpathRoot . "/entries/entry[name='{$cname}']");
				}
				catch (Exception $e)
				{
					// ignore
					$ex = null;
				}
				if ($ex && $ex['uuid'] != $object['uuid'])
				{
					throw new Exception("An entry with the host name (or other names) '{$cname}' already exists.");
				}

				$exnames = $this->configGetList(self::xpathRoot . "/entries/entry[contains(cnames, '{$cname}')]");

				foreach ($exnames as $ex)
				{

					// Skip ourselves
					if ($object['uuid'] == $ex['uuid'])
					{
						continue;
					}

					if (preg_match("/(^|\s){$cname}(,|$)/", $ex['cnames']))
					{
						throw new Exception("An entry with the host name (or other names) '{$cname}' already exists.");
					}

				}
			}

			$object['cnames'] = implode(', ', $cnames);
		}

		$oldconfig = array();

		// Set configuration data
		if ($data['uuid'] == $GLOBALS['OMV_UUID_UNDEFINED'])
		{

			// Append object to configuration
			$this->configSet(self::xpathRoot . "/entries", array("entry" => $object));

		}
		else
		{

			$oldconfig = $this->configGet(self::xpathRoot . "/entries/entry[uuid='{$data['uuid']}']");

			// Update existing configuration object
			$this->configReplace(self::xpathRoot . "/entries/entry[uuid='{$data['uuid']}']", $object);

		}

		// Save configuration
		$this->configSave();

		// Notify configuration changes
		$dispatcher = &OMVNotifyDispatcher::getInstance();
		$dispatcher->notify(($data['uuid'] == $GLOBALS['OMV_UUID_UNDEFINED']) ?
													OMV_NOTIFY_CREATE : OMV_NOTIFY_MODIFY,
												"org.openmediavault.services.dnsmasq.entries.entry", $object, $oldconfig);

	}

	/**
	 * Get a single Entry's configuration
	 *
	 * @param $uuid string configuration uuid of Entry
	 *
	 * @return array Entry configuration data
	 */
	public function getEntry($uuid)
	{

		// Validation
		$this->_validate(__METHOD__, func_get_args());

		// get existing Entry
		return $this->configGet(self::xpathRoot . "/entries/entry[uuid='{$uuid}']");

	}

	/**
	 * Get a list of static networks for this machine.
	 *
	 * @return array networks
	 */
	public function getNetworks()
	{

		$this->_validate();

		$ints = $this->configGetList("//system/network/interfaces/iface");
		$nets = array();

		foreach ($ints as $i)
		{

			if (!($i['netmask'] && $i['address']))
			{
				continue;
			}

			$netid = long2ip(ip2long($i['address']) & ip2long($i['netmask'])) . " / {$i['netmask']}";

			$nets[$netid] = $netid;
		}

		$networks = array();
		foreach ($nets as $n)
		{
			$networks[] = array('netid'=> $n);
		}
		return $networks;
	}


	/**
	 * Return a list of active leases
	 *
	 * @param $start     integer start point in paging list
	 * @param $count     integer number of objects to return in paged list
	 * @param $sortField string field to sort on
	 * @param $sortDir   integer sort direction
	 *
	 * @return array list of leases
	 */
	public function getLeaseList($data)
	{

		// Validation
		$this->_validate(__METHOD__, func_get_args());

		$objects = $this->getLeases(true);

		// Filter result
		return $this->applyFilter($objects, $data['start'], $data['limit'], $data['sortfield'], $data['sortdir']);

	}

	/**
	 *
	 * Returns a list of active leases used for combo box population
	 * when adding a Entry
	 *
	 * @return array list of leases
	 */
	public function getLeases($fromList = false)
	{

		$this->_validate();

		// This may not exist if DHCP is not enabled
		if (!intval($this->configGet(self::xpathRoot . '/dhcp-enable')))
		{
			return array();
		}

		$fp     = fopen("/var/lib/misc/dnsmasq.leases", "ro");
		$leases = array();

		if ($fp === false)
		{
			return $leases;
		}

		$exp = $name = $mac = $ip = '';

		while (!feof($fp))
		{

			$line = trim(fgets($fp));
			if (!$line)
			{
				continue;
			}

			// Get list of values
			list($exp, $mac, $ip, $name) = preg_split('/\s+/', $line);

			// Set display name
			if ($name != '*')
			{
				$disp = "{$name} ({$ip})";
			}
			else
			{
				$disp = $ip;
			}

			// Calculate expiry
			$exp -= time();

			// No need to calculate time if this is not
			// called from the Leases panel
			if ($exp <= 0 || !$fromList)
			{
				$exp = 'Expired';
			}
			else
			{

				$days = floor($exp / 86400);
				$exp -= ($days * 86400);

				$hours = floor($exp / 3600);
				$exp -= ($hours * 3600);

				$mins = floor($exp / 60);

				$exp = array();
				if ($days > 0)
				{
					$exp[] = "{$days} day(s)";
				}
				if ($hours > 0)
				{
					$exp[] = "{$hours} hour(s)";
				}
				if ($mins > 0)
				{
					$exp[] = "{$mins} minute(s)";
				}

				$exp = implode(", ", $exp);
			}

			$leases[] = array('ip'  => $ip,
												'mac' => $mac,
												'name'=> $name,
												'disp'=> $disp,
												'exp' => $exp
			);

		}

		// Not called from getLeaseList, sort by display name
		if (!$fromList)
		{
			usort($leases, function($a, $b)
			{
				return strnatcasecmp($a['disp'], $b['disp']);
			});
		}

		return $leases;

	}

}
