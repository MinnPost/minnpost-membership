<?php
/*
Plugin Name: MinnPost Membership
Description: This plugin manages various parts of MinnPost's membership UX.
Version: 0.3.7
Author: Jonathan Stegall
Author URI: https://code.minnpost.com
Text Domain: minnpost-membership
License: GPL2+
License URI: https://www.gnu.org/licenses/gpl-2.0.html
*/

/* Exit if accessed directly */
if ( ! defined( 'ABSPATH' ) ) {
	return;
}

/**
 * The full path to the main file of this plugin
 *
 * This can later be passed to functions such as
 * plugin_dir_path(), plugins_url() and plugin_basename()
 * to retrieve information about plugin paths
 *
 * @since 0.2.0
 * @var string
 */
define( 'MINNPOST_MEMBERSHIP_FILE', __FILE__ );

/**
 * The plugin's current version
 *
 * @since 0.2.0
 * @var string
 */
define( 'MINNPOST_MEMBERSHIP_VERSION', '0.3.7' );

// Load the autoloader.
require_once( 'lib/autoloader.php' );

/**
 * Retrieve the instance of the main plugin class
 *
 * @since 0.2.0
 * @return MinnPost_Membership
 */
function minnpost_membership() {
	static $plugin;

	if ( is_null( $plugin ) ) {
		$plugin = new MinnPost_Membership( MINNPOST_MEMBERSHIP_VERSION, __FILE__ );
	}

	return $plugin;
}

minnpost_membership()->init();
