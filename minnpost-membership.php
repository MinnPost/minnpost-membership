<?php
/*
Plugin Name: MinnPost Membership
Description: This plugin manages various parts of MinnPost's membership UX.
Version: 0.0.1
Author: Jonathan Stegall
Author URI: https://code.minnpost.com
Text Domain: minnpost-membership
License: GPL2+
License URI: https://www.gnu.org/licenses/gpl-2.0.html
*/

class MinnPost_Membership {

	/**
	* @var string
	* The plugin version
	*/
	private $version;

	/**
	* @var string
	* The plugin's slug
	*/
	protected $slug;

	/**
	* @var string
	* The plugin's prefix for saving options
	*/
	protected $option_prefix;

	/**
	* @var object
	* Load and initialize the MinnPost_Membership_Admin class
	*/
	public $admin;

	/**
	 * @var object
	 * Static property to hold an instance of the class; this seems to make it reusable
	 *
	 */
	static $instance = null;

	/**
	* Load the static $instance property that holds the instance of the class.
	* This instance makes the class reusable by other plugins
	*
	* @return object
	*
	*/
	static public function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new MinnPost_Membership();
		}
		return self::$instance;
	}

	/**
	 * This is our constructor
	 *
	 * @return void
	 */
	public function __construct() {

		$this->version       = '0.0.1';
		$this->slug          = 'minnpost-membership';
		$this->option_prefix = 'minnpost_membership';

		// admin settings
		$this->admin = $this->admin();

	}

	/**
	 * Plugin admin
	 *
	 * @return object $admin
	 */
	public function admin() {
		require_once( plugin_dir_path( __FILE__ ) . 'classes/class-minnpost-membership-admin.php' );
		$admin = new MinnPost_Membership_Admin( $this->option_prefix, $this->version, $this->slug );
		add_filter( 'plugin_action_links', array( $this, 'plugin_action_links' ), 10, 2 );
		return $admin;
	}

	/**
	* Display a Settings link on the main Plugins page
	*
	* @param array $links
	* @param string $file
	* @return array $links
	* These are the links that go with this plugin's entry
	*/
	public function plugin_action_links( $links, $file ) {
		if ( plugin_basename( __FILE__ ) === $file ) {
			$settings = '<a href="' . get_admin_url() . 'admin.php?page=' . $this->slug . '">' . __( 'Settings', 'minnpost-membership' ) . '</a>';
			array_unshift( $links, $settings );
		}
		return $links;
	}

}

// Instantiate our class
$minnpost_membership = MinnPost_Membership::get_instance();
