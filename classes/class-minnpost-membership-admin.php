<?php
/**
 * Class file for the MinnPost_Membership_Admin class.
 *
 * @file
 */

if ( ! class_exists( 'MinnPost_Membership' ) ) {
	die();
}

/**
 * Create default WordPress admin functionality to configure the plugin.
 */
class MinnPost_Membership_Admin {

	protected $option_prefix;
	protected $version;
	protected $slug;
	protected $member_levels;
	protected $user_info;
	protected $content_items;
	protected $cache;

	/**
	* Constructor which sets up admin pages
	*
	* @param string $option_prefix
	* @param string $version
	* @param string $slug
	* @param object $member_levels
	* @param object $user_info
	* @param object $content_items
	* @param object $cache
	* @throws \Exception
	*/
	public function __construct( $option_prefix, $version, $slug, $member_levels, $user_info, $content_items, $cache ) {

		$this->option_prefix = $option_prefix;
		$this->version       = $version;
		$this->slug          = $slug;
		$this->member_levels = $member_levels;
		$this->user_info     = $user_info;
		$this->content_items = $content_items;
		$this->cache         = $cache;

		$this->pages = $this->get_admin_pages();

		$this->mp_mem_transients = $this->cache->mp_mem_transients;

		$this->add_actions();

	}

	/**
	* Create the action hooks to create the admin page(s)
	*
	*/
	public function add_actions() {
		if ( is_admin() ) {
			add_action( 'admin_menu', array( $this, 'create_admin_menu' ) );
			add_action( 'admin_init', array( $this, 'admin_settings_form' ) );
			add_action( 'admin_enqueue_scripts', array( $this, 'admin_scripts_and_styles' ) );
			add_action( 'admin_post_post_member_level', array( $this, 'prepare_member_level_data' ) );
			add_action( 'admin_post_delete_member_level', array( $this, 'delete_member_level' ) );
			add_filter( 'pre_update_option_' . $this->option_prefix . 'payment_urls', array( $this, 'url_option_updated' ), 10, 2 );
			add_filter( 'pre_update_option_' . $this->option_prefix . 'explain_member_benefit_urls', array( $this, 'url_option_updated' ), 10, 2 );
			add_filter( 'pre_update_option_' . $this->option_prefix . 'use_member_benefit_urls', array( $this, 'url_option_updated' ), 10, 2 );
			add_filter( 'pre_update_option_' . $this->option_prefix . 'campaign_ids', array( $this, 'campaign_ids_updated' ), 10, 2 );

			add_filter( 'tiny_mce_before_init', array( $this, 'editor_settings' ), 10, 2 );

		}

	}

	/**
	* Create WordPress admin options page
	*
	*/
	public function create_admin_menu() {
		$capability = 'manage_minnpost_membership_options';
		add_menu_page( __( 'MinnPost Membership', 'minnpost-membership' ), __( 'Membership', 'minnpost-membership' ), $capability, $this->slug, array( $this, 'show_admin_page' ), 'dashicons-groups' );
		$pages = $this->get_admin_pages();
		foreach ( $pages as $key => $value ) {
			add_submenu_page( $this->slug, $value['title'], $value['title'], $capability, $key, array( $this, 'show_admin_page' ) );
		}
		// Remove the default page called Membership because that's annoying
		remove_submenu_page( $this->slug, $this->slug );
	}

	/**
	* Create WordPress admin options menu pages
	*
	* @return array $pages
	*
	*/
	private function get_admin_pages() {
		$pages = array(
			$this->slug . '-settings'           => array(
				'title'    => __( 'General Settings', 'minnpost-membership' ),
				'sections' => array(
					'member_levels' => __( 'Member levels', 'minnpost-membership' ),
					'more_settings' => __( 'More settings', 'minnpost-membership' ),
				),
				'use_tabs' => false,
			),
			$this->slug . '-site-header'        => array(
				'title'    => __( 'Site Header', 'minnpost-membership' ),
				'sections' => array(
					'display' => __( 'Display', 'minnpost-membership' ),
				),
				'use_tabs' => false,
			),
			$this->slug . '-taking-payments'    => array(
				'title'    => __( 'Taking Payments', 'minnpost-membership' ),
				'sections' => $this->setup_payment_page_sections(),
				'use_tabs' => true,
			),
			$this->slug . '-managing-donations' => array(
				'title'    => __( 'Managing Donations', 'minnpost-membership' ),
				'sections' => array(
					'shared_fields'    => __( 'Shared Fields', 'minnpost-membership' ),
					'donations'        => __( 'Active/Pending Donations', 'minnpost-membership' ),
					'donation_history' => __( 'Donation History', 'minnpost-membership' ),
				),
				'use_tabs' => true,
			),
			$this->slug . '-campaign-settings'  => array(
				'title'    => __( 'Campaign Settings', 'minnpost-membership' ),
				'sections' => $this->setup_campaign_sections(),
				'use_tabs' => true,
			),
			$this->slug . '-explain-benefits'   => array(
				'title'    => __( 'Explain Benefits', 'minnpost-membership' ),
				'sections' => $this->setup_explain_benefit_page_sections(),
				'use_tabs' => true,
			),
			$this->slug . '-use-benefits'       => array(
				'title'    => __( 'Use Benefits', 'minnpost-membership' ),
				'sections' => $this->setup_use_benefit_page_sections(),
				'use_tabs' => true,
			),
			$this->slug . '-benefit-results'    => array(
				'title'    => __( 'Benefit Results', 'minnpost-membership' ),
				'sections' => array(
					'partner-offer-claims' => __( 'Partner offer claims', 'minnpost-membership' ),
					'fan-club-votes'       => __( 'FAN Club votes', 'minnpost-membership' ),
				),
				'use_tabs' => true,
			),
			/*$this->slug . '-member-drive'       => array(
				'title'    => __( 'Member Drive', 'minnpost-membership' ),
				'sections' => array(),
				'use_tabs' => false,
			),*/
			$this->slug . '-premium-content'    => array(
				'title'    => __( 'Premium Content', 'minnpost-membership' ),
				'sections' => array(
					'access_settings' => __( 'Access settings', 'minnpost-membership' ),
				),
				'use_tabs' => false,
			),
			/*$this->slug . '-site-notifications' => array(
				'title'    => __( 'Site Notifications', 'minnpost-membership' ),
				'sections' => array(),
				'use_tabs' => false,
			),*/
		); // this creates the pages for the admin

		return $pages;
	}

	/**
	* Display the admin settings page
	*
	* @return void
	*/
	public function show_admin_page() {
		$get_data = filter_input_array( INPUT_GET, FILTER_SANITIZE_STRING );
		?>
		<div class="wrap">
			<h1><?php _e( get_admin_page_title(), 'minnpost-membership' ); ?></h1>
			<?php
			$page     = isset( $get_data['page'] ) ? sanitize_key( $get_data['page'] ) : $this->slug . '-settings';
			$tab      = isset( $get_data['tab'] ) ? sanitize_key( $get_data['tab'] ) : $page;
			$section  = $tab;
			$sections = $this->pages[ $page ]['sections'];
			if ( ! empty( $sections ) && true === $this->pages[ $page ]['use_tabs'] ) {
				$tabs = $this->pages[ $page ]['sections'];
				if ( isset( $get_data['tab'] ) ) {
					$tab = sanitize_key( $get_data['tab'] );
				} else {
					reset( $tabs );
					$tab = key( $tabs );
				}
				$this->render_tabs( $page, $tabs, $tab );
			}
			switch ( $page ) {
				case $this->slug . '-settings':
					if ( isset( $get_data['method'] ) ) {
						$method      = sanitize_key( $get_data['method'] );
						$error_url   = get_admin_url( null, 'admin.php?page=' . $page . '&method=' . $method );
						$success_url = get_admin_url( null, 'admin.php?page=' . $page );

						if ( isset( $get_data['transient'] ) ) {
							$transient = sanitize_key( $get_data['transient'] );
							$posted    = $this->mp_mem_transients->get( $transient );
						}

						if ( isset( $posted ) && is_array( $posted ) ) {
							$member_level = $posted;
							$id           = $member_level['id'];
						} elseif ( 'edit-member-level' === $method || 'delete-member-level' === $method ) {
							$id           = $get_data['id'];
							$member_level = $this->member_levels->get_member_levels( isset( $id ) ? sanitize_key( $id ) : '', true, 'id', true );
						}

						$benefits = '';

						if ( isset( $member_level ) && is_array( $member_level ) ) {
							$name                   = $member_level['name'];
							$is_nonmember           = isset( $member_level['is_nonmember'] ) ? intval( $member_level['is_nonmember'] ) : '';
							$minimum_monthly_amount = $member_level['minimum_monthly_amount'];
							$maximum_monthly_amount = $member_level['maximum_monthly_amount'];
							$starting_value         = $member_level['starting_value'];
							$benefits               = $member_level['benefits'];
						}

						if ( 'add-member-level' === $method || 'edit-member-level' === $method ) {
							require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/member-levels-add-edit.php' );
						} elseif ( 'delete-member-level' === $method ) {
							require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/member-levels-delete.php' );
						}
					} else {
						$member_levels = $this->member_levels->get_member_levels();
						require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/general-settings.php' );
					}
					break;
				case $this->slug . '-benefit-results':
					if ( ! isset( $tab ) ) {
						$tab = 'partner-offer-claims';
					}
					$offers = $this->content_items->get_partner_offers();
					foreach ( $offers as $key => $offer ) {
						foreach ( $offer->instances as $i_key => $instance ) {
							if ( isset( $instance['_mp_partner_offer_claim_user'] ) ) {
								$offers[ $key ]->instances[ $i_key ]['user']      = get_userdata( $instance['_mp_partner_offer_claim_user']['id'] );
								$offers[ $key ]->instances[ $i_key ]['user_meta'] = get_user_meta( $instance['_mp_partner_offer_claim_user']['id'] );
							}
							if ( ! isset( $instance['_mp_partner_offer_claimed_date'] ) || '' === $instance['_mp_partner_offer_claimed_date'] ) {
								unset( $offers[ $key ]->instances[ $i_key ] );
							}
						}
						if ( empty( $offer->instances ) ) {
							unset( $offers[ $key ] );
						}
					}
					require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/benefit-results-' . $tab . '.php' );
					break;
				default:
					require_once( plugin_dir_path( __FILE__ ) . '/../templates/admin/settings.php' );
					break;
			} // End switch().*/
			?>

		</div>
		<?php
	}

	/**
	* Render tabs for settings pages in admin
	* @param string $page
	* @param array $tabs
	* @param string $tab
	*/
	private function render_tabs( $page, $tabs, $tab = 'default' ) {
		$get_data = filter_input_array( INPUT_GET, FILTER_SANITIZE_STRING );

		$current_tab = $tab;
		echo '<h2 class="nav-tab-wrapper">';
		foreach ( $tabs as $tab_key => $tab_caption ) {
			$active = $current_tab === $tab_key ? ' nav-tab-active' : '';
			echo sprintf( '<a class="nav-tab%1$s" href="%2$s">%3$s</a>',
				esc_attr( $active ),
				esc_url( '?page=' . $page . '&tab=' . $tab_key ),
				esc_html( $tab_caption )
			);

		}
		echo '</h2>';

		if ( isset( $get_data['tab'] ) ) {
			$tab = sanitize_key( $get_data['tab'] );
		}
	}

	/**
	* Register items for the settings api
	* @return void
	*
	*/
	public function admin_settings_form() {

		$get_data = filter_input_array( INPUT_GET, FILTER_SANITIZE_STRING );
		$page     = isset( $get_data['page'] ) ? sanitize_key( $get_data['page'] ) : $this->slug . '-settings';
		if ( false === strpos( $page, $this->slug ) ) {
			return;
		}
		$tab     = isset( $get_data['tab'] ) ? sanitize_key( $get_data['tab'] ) : $page;
		$section = $tab;

		$input_callback_default   = array( $this, 'display_input_field' );
		$input_checkboxes_default = array( $this, 'display_checkboxes' );
		$input_select_default     = array( $this, 'display_select' );
		$textarea_default         = array( $this, 'display_textarea' );
		$editor_default           = array( $this, 'display_editor' );
		$link_default             = array( $this, 'display_link' );

		$all_field_callbacks = array(
			'text'       => $input_callback_default,
			'checkboxes' => $input_checkboxes_default,
			'select'     => $input_select_default,
			'textarea'   => $textarea_default,
			'editor'     => $editor_default,
			'link'       => $link_default,
		);

		$this->general_settings( $page, $all_field_callbacks );
		$this->site_header( $page, $all_field_callbacks );
		$this->taking_payments( $page, $all_field_callbacks );
		$this->managing_donations( $page, $all_field_callbacks );
		$this->campaign_settings( $page, $all_field_callbacks );
		$this->explain_benefits( $page, $all_field_callbacks );
		$this->use_benefits( $page, $all_field_callbacks );
		$this->benefit_results( $page, $all_field_callbacks );
		$this->premium_content( $page, $all_field_callbacks );

	}

	/**
	* Admin styles. Load the CSS and/or JavaScript for the plugin's settings
	*
	* @return void
	*/
	public function admin_scripts_and_styles() {
		wp_enqueue_script( $this->slug . '-front-end', plugins_url( 'assets/js/' . $this->slug . '-front-end.min.js', dirname( __FILE__ ) ), array( 'jquery' ), filemtime( plugin_dir_path( __FILE__ ) . '../assets/js/' . $this->slug . '-front-end.min.js' ), true );
		wp_enqueue_script( $this->slug . '-admin', plugins_url( 'assets/js/' . $this->slug . '-admin.min.js', dirname( __FILE__ ) ), array( 'jquery', $this->slug . '-front-end' ), filemtime( plugin_dir_path( __FILE__ ) . '../assets/js/' . $this->slug . '-admin.min.js' ), true );
		wp_enqueue_style( $this->slug . '-admin', plugins_url( 'assets/css/' . $this->slug . '-admin.min.css', dirname( __FILE__ ) ), array(), filemtime( plugin_dir_path( __FILE__ ) . '../assets/css/' . $this->slug . '-admin.min.css' ) );
	}

	/**
	* Fields for the General Settings page
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param array $callbacks
	*/
	private function general_settings( $page, $callbacks ) {
		if ( isset( $this->get_admin_pages()[ $page ] ) ) {

			$sections = $this->get_admin_pages()[ $page ]['sections'];
			if ( ! empty( $sections ) ) {
				foreach ( $sections as $key => $value ) {
					add_settings_section( $key, $value, null, $page );
				}
			} else {
				$section = $page;
				$title   = $this->get_admin_pages()[ $page ]['title'];
				add_settings_section( $section, $title, null, $page );
			}

			$settings = array(
				'use_member_levels'  => array(
					'title'    => __( 'Use member levels?', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $page,
					'section'  => 'member_levels',
					'args'     => array(
						'type'     => 'checkbox',
						'desc'     => '',
						'constant' => '',
					),
				),
				'frequency_options'  => array(
					'title'    => __( 'Frequency options', 'minnpost-membership' ),
					'callback' => $callbacks['checkboxes'],
					'page'     => $page,
					'section'  => 'member_levels',
					'args'     => array(
						'type'     => 'select',
						'desc'     => '',
						'constant' => '',
						'items'    => $this->member_levels->get_frequency_options(),
					),
				),
				'disable_javascript' => array(
					'title'    => __( 'Disable plugin JavaScript?', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $page,
					'section'  => 'more_settings',
					'args'     => array(
						'type'     => 'checkbox',
						'desc'     => __( 'Checking this will keep the plugin from adding its JavaScript to the front end interface.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'disable_css'        => array(
					'title'    => __( 'Disable plugin CSS?', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $page,
					'section'  => 'more_settings',
					'args'     => array(
						'type'     => 'checkbox',
						'desc'     => __( 'Checking this will keep the plugin from adding its stylesheet to the front end interface.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
			);

			$frequency_options = get_option( $this->option_prefix . 'frequency_options', array() );
			if ( ! empty( $frequency_options ) ) {

				$options = array();
				foreach ( $frequency_options as $key ) {
					$options[ $key ] = $this->member_levels->get_frequency_options( $key );
				}

				$settings['default_frequency'] = array(
					'title'    => __( 'Default frequency', 'minnpost-membership' ),
					'callback' => $callbacks['checkboxes'],
					'page'     => $page,
					'section'  => 'member_levels',
					'args'     => array(
						'type'     => 'radio',
						'desc'     => '',
						'constant' => '',
						'items'    => $options,
					),
				);
			}

			foreach ( $settings as $key => $attributes ) {
				$id       = $this->option_prefix . $key;
				$name     = $this->option_prefix . $key;
				$title    = $attributes['title'];
				$callback = $attributes['callback'];
				$page     = $attributes['page'];
				$section  = $attributes['section'];
				$class    = isset( $attributes['class'] ) ? $attributes['class'] : 'minnpost-member-field ' . $id;
				$args     = array_merge(
					$attributes['args'],
					array(
						'title'     => $title,
						'id'        => $id,
						'label_for' => $id,
						'name'      => $name,
						'class'     => $class,
					)
				);

				// if there is a constant and it is defined, don't run a validate function if there is one
				if ( isset( $attributes['args']['constant'] ) && defined( $attributes['args']['constant'] ) ) {
					$validate = '';
				}
				add_settings_field( $id, $title, $callback, $page, $section, $args );
				register_setting( $page, $id );
			}
		}
	}

	/**
	* Fields for the support header at the top of the site
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param array $callbacks
	*/
	function site_header( $page, $callbacks ) {
		if ( isset( $this->get_admin_pages()[ $page ] ) ) {
			$sections = $this->get_admin_pages()[ $page ]['sections'];
			if ( ! empty( $sections ) ) {
				foreach ( $sections as $key => $value ) {
					$section = $key;
					$title   = $value;
					add_settings_section( $section, $title, null, $page );
				}
			} else {
				$section = $page;
				$title   = $this->get_admin_pages()[ $page ]['title'];
				add_settings_section( $section, $title, null, $page );
			}

			$payment_urls = get_option( $this->option_prefix . 'payment_urls', '' );
			if ( '' !== $payment_urls ) {
				$payment_urls = explode( "\r\n", $payment_urls );
				$payment_url  = $payment_urls[0];
			} else {
				$payment_url = '';
			}

			$this_section = 'display';
			$settings     = array(
				'tagline_text'         => array(
					'title'    => __( 'Tagline text', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $page,
					'section'  => $this_section,
					'args'     => array(
						'type'     => 'text',
						'desc'     => sprintf(
							// translators: %1 is the site description
							__( 'This value will be used for the tagline. If you do not add a value, the site will use the value for the site tagline from the WordPress general settings: %1$s', 'minnpost-membership' ),
							get_bloginfo( 'description' )
						),
						'constant' => '',
					),
				),
				'button_include_heart' => array(
					'title'    => __( 'Include the heart?', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $page,
					'section'  => $this_section,
					'args'     => array(
						'type'     => 'checkbox',
						'desc'     => __( 'If checked, the button will include the heart in front of the text.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'button_text'          => array(
					'title'    => __( 'Button text', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $page,
					'section'  => $this_section,
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'This value will be used for the button text. If you do not add a value, the value will be Donate.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'button_class'         => array(
					'title'    => __( 'Button CSS class', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $page,
					'section'  => $this_section,
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Add any CSS classes for styling, scripting, etc. Separate multiple classes with spaces.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'button_url'           => array(
					'title'    => __( 'Button URL', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $page,
					'section'  => $this_section,
					'args'     => array(
						'type'     => 'text',
						'desc'     => sprintf(
							// translators: %1 is the first payment URL
							__( 'When a user clicks the button, they will go to this URL. Only add a full URL if it is not within this site. If you leave it blank, the button will use the first payment URL: %1$s', 'minnpost-membership' ),
							$payment_url
						),
						'constant' => '',
					),
				),
			);

			foreach ( $settings as $key => $attributes ) {
				$id       = $this->option_prefix . $key;
				$name     = $this->option_prefix . $key;
				$title    = $attributes['title'];
				$callback = $attributes['callback'];
				$page     = $attributes['page'];
				$section  = $attributes['section'];
				$class    = isset( $attributes['class'] ) ? $attributes['class'] : 'minnpost-member-field ' . $id;
				$args     = array_merge(
					$attributes['args'],
					array(
						'title'     => $title,
						'id'        => $id,
						'label_for' => $id,
						'name'      => $name,
						'class'     => $class,
					)
				);

				// if there is a constant and it is defined, don't run a validate function if there is one
				if ( isset( $attributes['args']['constant'] ) && defined( $attributes['args']['constant'] ) ) {
					$validate = '';
				}
				add_settings_field( $id, $title, $callback, $page, $section, $args );
				register_setting( $section, $id );
			}
		}
	}

	/**
	* Fields for the Taking Payments page
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param array $callbacks
	*/
	private function taking_payments( $page, $callbacks ) {
		if ( isset( $this->get_admin_pages()[ $page ] ) ) {
			$sections = $this->get_admin_pages()[ $page ]['sections'];
			if ( ! empty( $sections ) ) {
				foreach ( $sections as $key => $value ) {
					$section = $key;
					$title   = $value;
					$page    = $section;
					add_settings_section( $section, $title, null, $page );
				}
			} else {
				$section = $page;
				$title   = $this->get_admin_pages()[ $page ]['title'];
				add_settings_section( $section, $title, null, $page );
			}

			$settings = array(
				'payment_urls'                => array(
					'title'    => __( 'Payment URLs', 'minnpost-membership' ),
					'callback' => $callbacks['textarea'],
					'page'     => 'payment_pages',
					'section'  => 'payment_pages',
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'rows'     => 5,
						'cols'     => '',
					),
				),
				'payment_processor_url'       => array(
					'title'    => __( 'Payment processor URL', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'payment_pages',
					'section'  => 'payment_pages',
					'args'     => array(
						'type'     => 'text',
						'desc'     => '',
						'constant' => 'PAYMENT_PROCESSOR_URL',
					),
				),
				'empty_amount_status_message' => array(
					'title'    => __( 'Error message for missing amount', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'payment_pages',
					'section'  => 'payment_pages',
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				),
			);

			$payment_sections = $this->setup_payment_page_sections();
			if ( ! empty( $payment_sections ) ) {
				foreach ( $payment_sections as $key => $value ) {
					$section = $key;
					$title   = $value;
					$page    = $section;
					add_settings_section( $section, $title, null, $page );
				}
			}

			// /support page options
			$this_section                         = 'support';
			$settings[ $this_section . '_title' ] = array(
				'title'    => __( 'Page title', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'class'    => 'minnpost-membership-title-field',
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_summary' ] = array(
				'title'    => __( 'Summary', 'minnpost-membership' ),
				'callback' => $callbacks['editor'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'          => '',
					'constant'      => '',
					'type'          => 'text',
					'rows'          => '5',
					'media_buttons' => false,
				),
			);

			$settings[ $this_section . '_pre_suggested_amounts_text' ] = array(
				'title'    => __( 'Suggested amounts intro', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => __( 'Explains the list of suggested amounts', 'minnpost-membership' ),
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_pre_form_text' ] = array(
				'title'    => __( 'Pre form text', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => __( 'This is the text before, and on the same line as, the form fields', 'minnpost-membership' ),
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_start_value' ] = array(
				'title'    => __( 'Start value', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_form_nonmembers' ] = array(
				'title'    => __( 'Post form text - non-members', 'minnpost-membership' ),
				'callback' => $callbacks['textarea'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => __( 'This value is used if the user is not a member, or if the checkbox below remains unchecked. $level will show as ' . get_bloginfo( 'name' ) . ' Level', 'minnpost-membership' ),
					'constant' => '',
					'type'     => 'text',
					'rows'     => 3,
					'cols'     => '',
				),
			);

			$settings[ $this_section . '_post_form_link_url' ] = array(
				'title'    => __( 'Post form link URL', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => __( 'If present, this URL will wrap the above (or below) text value.', 'minnpost-membership' ),
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_form_change_for_members' ] = array(
				'title'    => __( 'Change post-form text for members?', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => __( 'If checked, the message above will instead change based on the current member status of the logged in user, as in the fields below.', 'minnpost-membership' ),
					'constant' => '',
					'type'     => 'checkbox',
				),
			);

			$settings[ $this_section . '_post_form_nochange' ] = array(
				'title'    => __( 'Post form text - no change', 'minnpost-membership' ),
				'callback' => $callbacks['textarea'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => __( 'This text is used if the user\'s membership status has not changed based on this transaction. $current_level will show as ' . get_bloginfo( 'name' ) . ' Level.', 'minnpost-membership' ),
					'constant' => '',
					'type'     => 'text',
					'rows'     => 5,
					'cols'     => '',
				),
			);

			$settings[ $this_section . '_post_form_change' ] = array(
				'title'    => __( 'Post form text - change', 'minnpost-membership' ),
				'callback' => $callbacks['textarea'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => __( 'This text is used if the user\'s membership status has changed based on this transaction.  $current_level and $new_level will show as ' . get_bloginfo( 'name' ) . ' Level.', 'minnpost-membership' ),
					'constant' => '',
					'type'     => 'text',
					'rows'     => 5,
					'cols'     => '',
				),
			);

			$settings[ $this_section . '_button_text' ] = array(
				'title'    => __( 'Button text', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_form_link_text_next_to_button' ] = array(
				'title'    => __( 'Link text next to button', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_form_link_url_next_to_button' ] = array(
				'title'    => __( 'Link URL next to button', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_body' ] = array(
				'title'    => __( 'Post body content', 'minnpost-membership' ),
				'callback' => $callbacks['editor'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'          => __( 'You can do basic edits without worrying about HTML knowledge, but more than that will cause problems with the underlying structure.', 'minnpost-membership' ),
					'constant'      => '',
					'type'          => 'text',
					'rows'          => '5',
					'media_buttons' => false,
				),
			);

			$settings[ $this_section . '_post_body_text_link' ] = array(
				'title'    => __( 'Post body text link', 'minnpost-membership' ),
				'callback' => $callbacks['textarea'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
					'rows'     => 3,
					'cols'     => '',
				),
			);

			$settings[ $this_section . '_post_body_link_url' ] = array(
				'title'    => __( 'Post body link URL', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_body_link_fragment' ] = array(
				'title'    => __( 'Post body link fragment', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_body_link_class' ] = array(
				'title'    => __( 'Post body link class', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_body_link_text' ] = array(
				'title'    => __( 'Post body link text', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_body_show_member_details_link' ] = array(
				'title'    => __( 'Show link to member benefit details page?', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'checkbox',
				),
			);

			// /support/member-benefits page options
			$this_section                              = 'support-member-benefits';
			$settings[ $this_section . '_submit_url' ] = array(
				'title'    => __( 'Submit URL', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'class'    => 'minnpost-membership-title-field',
				'args'     => array(
					'desc'     => __( 'Enter the URL users should be sent to after submitting the form. If you leave it blank, the site will use the default payment processor URL instead.', 'minnpost-membership' ),
					'constant' => '',
					'type'     => 'text',
				),
			);
			$settings[ $this_section . '_title' ]      = array(
				'title'    => __( 'Page title', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'class'    => 'minnpost-membership-title-field',
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_pre_form_text' ] = array(
				'title'    => __( 'Pre-form text', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			/*$settings[ $this_section . '_post_form_text' ] = array(
				'title'    => __( 'Post-form text', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_form_text_link' ] = array(
				'title'    => __( 'Post-form text link', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);*/

			$settings[ $this_section . '_default_level' ] = array(
				'title'    => __( 'Default level', 'minnpost-membership' ),
				'callback' => $callbacks['select'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'type'     => 'select',
					'desc'     => '',
					'constant' => '',
					'items'    => $this->get_member_level_options(),
				),
			);

			$settings[ $this_section . '_level_button_text' ] = array(
				'title'    => __( 'Level button text', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_give_button_text' ] = array(
				'title'    => __( 'Give button text', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_body_text_link' ] = array(
				'title'    => __( 'Post body text link', 'minnpost-membership' ),
				'callback' => $callbacks['textarea'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
					'rows'     => 5,
					'cols'     => '',
				),
			);

			$settings[ $this_section . '_post_body_link_url' ] = array(
				'title'    => __( 'Post body link URL', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_body_link_fragment' ] = array(
				'title'    => __( 'Post body link fragment', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_body_link_class' ] = array(
				'title'    => __( 'Post body link class', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_body_link_text' ] = array(
				'title'    => __( 'Post body link text', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_body_show_member_details_link' ] = array(
				'title'    => __( 'Show link to member benefit details page?', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'checkbox',
				),
			);

			foreach ( $settings as $key => $attributes ) {
				$id       = $this->option_prefix . $key;
				$name     = $this->option_prefix . $key;
				$title    = $attributes['title'];
				$callback = $attributes['callback'];
				$page     = $attributes['page'];
				$section  = $attributes['section'];
				$class    = isset( $attributes['class'] ) ? $attributes['class'] : 'minnpost-member-field ' . $id;
				$args     = array_merge(
					$attributes['args'],
					array(
						'title'     => $title,
						'id'        => $id,
						'label_for' => $id,
						'name'      => $name,
						'class'     => $class,
					)
				);

				// if there is a constant and it is defined, don't run a validate function if there is one
				if ( isset( $attributes['args']['constant'] ) && defined( $attributes['args']['constant'] ) ) {
					$validate = '';
				}
				add_settings_field( $id, $title, $callback, $page, $section, $args );
				register_setting( $section, $id );
			}
		}
	}

	/**
	* Fields for the Managing Donations page
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param array $callbacks
	*/
	private function managing_donations( $page, $callbacks ) {
		if ( isset( $this->get_admin_pages()[ $page ] ) ) {
			$sections = $this->get_admin_pages()[ $page ]['sections'];
			if ( ! empty( $sections ) ) {
				foreach ( $sections as $key => $value ) {
					$section = $key;
					$title   = $value;
					$page    = $section;
					add_settings_section( $section, $title, null, $page );
				}
			} else {
				$section = $page;
				$title   = $this->get_admin_pages()[ $page ]['title'];
				add_settings_section( $section, $title, null, $page );
			}

			$settings = array(
				'edit_opportunity_link'        => array(
					'title'    => __( 'URL for editing opportunities', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'shared_fields',
					'section'  => 'shared_fields',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Enter the full URL. $opportunity_id will be replaced with the Salesforce Id value for the opportunity.', 'minnpost-membership' ),
						'constant' => 'OPPORTUNITY_EDIT_URL',
					),
				),
				'opportunity_type_value'       => array(
					'title'    => __( 'Opportunity type field', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'shared_fields',
					'section'  => 'shared_fields',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Value expected for the Type field on a Salesforce opportunity.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'opp_contact_field'            => array(
					'title'    => __( 'Opportunity Contact ID field', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'shared_fields',
					'section'  => 'shared_fields',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Salesforce field that contains the Contact ID for an opportunity.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'opp_payment_type_field'       => array(
					'title'    => __( 'Payment type field', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'shared_fields',
					'section'  => 'shared_fields',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Salesforce field that determines payment type for opportunities.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'opp_payment_type_value'       => array(
					'title'    => __( 'Payment type value', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'shared_fields',
					'section'  => 'shared_fields',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Expected value for payment type on opportunities. If both these fields are present, only matching opportunities will be queried.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'onetime_field'                => array(
					'title'    => __( 'Onetime recurrence field', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'shared_fields',
					'section'  => 'shared_fields',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Salesforce field that ensures an opportunity is one-time only.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'onetime_value'                => array(
					'title'    => __( 'Onetime recurrence value', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'shared_fields',
					'section'  => 'shared_fields',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Expected value for the onetime recurrence field if an opportunity is one-time only.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'no_donation_message'          => array(
					'title'    => __( 'No donation message', 'minnpost-membership' ),
					'callback' => $callbacks['editor'],
					'page'     => 'shared_fields',
					'section'  => 'shared_fields',
					'args'     => array(
						'desc'          => __( 'Message to display if the user has no donations. This will appear on both the donation and donation history pages.', 'minnpost-membership' ),
						'constant'      => '',
						'type'          => 'text',
						'rows'          => '8',
						'media_buttons' => false,
					),
				),
				'edit_recurring_link'          => array(
					'title'    => __( 'URL for editing recurring donations', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donations',
					'section'  => 'donations',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Enter the full URL. $recurring_donation_id will be replaced with the Salesforce Id value for the active recurring donation.', 'minnpost-membership' ),
						'constant' => 'RECURRING_DONATION_EDIT_URL',
					),
				),
				'cancel_recurring_link'        => array(
					'title'    => __( 'URL for cancelling recurring donations', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donations',
					'section'  => 'donations',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Enter the full URL. $recurring_donation_id will be replaced with the Salesforce Id value for the active recurring donation.', 'minnpost-membership' ),
						'constant' => 'RECURRING_DONATION_CANCEL_URL',
					),
				),
				'cancel_opportunity_link'      => array(
					'title'    => __( 'URL for cancelling opportunities', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donations',
					'section'  => 'donations',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Enter the full URL. $opportunity_id will be replaced with the Salesforce Id value for the opportunity.', 'minnpost-membership' ),
						'constant' => 'OPPORTUNITY_CANCEL_URL',
					),
				),
				'active_status_field'          => array(
					'title'    => __( 'Active status field', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donations',
					'section'  => 'donations',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Salesforce field that determines if a recurring donation is active. Use the API Name value for the field.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'active_status_value'          => array(
					'title'    => __( 'Active status value', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donations',
					'section'  => 'donations',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Expected value for the active status field if the donation is active.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'recurring_payment_type_field' => array(
					'title'    => __( 'Payment type field', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donations',
					'section'  => 'donations',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Salesforce field that determines payment type for recurring donations.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'recurring_payment_type_value' => array(
					'title'    => __( 'Payment type value', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donations',
					'section'  => 'donations',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Expected value for payment type on recurring donations. If both these fields are present, only matching recurring donations will be queried.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'donation_history_message'     => array(
					'title'    => __( 'Donation history message', 'minnpost-membership' ),
					'callback' => $callbacks['editor'],
					'page'     => 'donations',
					'section'  => 'donations',
					'args'     => array(
						'desc'          => __( 'Message to display to send the user to the donation history page. This will only show if the user actually has previous donations.', 'minnpost-membership' ),
						'constant'      => '',
						'type'          => 'text',
						'rows'          => '8',
						'media_buttons' => false,
					),
				),
				'history_failed_value'        => array(
					'title'    => __( 'Failed donation value', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donation_history',
					'section'  => 'donation_history',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Expected value for StageName field when a donation has failed.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'history_success_value'       => array(
					'title'    => __( 'Successful donation value', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donation_history',
					'section'  => 'donation_history',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Expected value for StageName field when a donation has succeeded.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'history_days_for_failed'     => array(
					'title'    => __( 'Days back for failed donations', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donation_history',
					'section'  => 'donation_history',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'The list of failed donations will go back this many days from today. Ex: 30 means all donations failed within the last 30 days will be listed.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'failed_recurring_id_field'   => array(
					'title'    => __( 'Recurring donation ID field name', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donation_history',
					'section'  => 'donation_history',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'If a failed opportunity is part of a recurring donation, the value of this field will be used to get the ID for that recurring donation.', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'history_failed_heading'      => array(
					'title'    => __( 'Heading for failed donations', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donation_history',
					'section'  => 'donation_history',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Heading for failed donation table', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'history_failed_message'      => array(
					'title'    => __( 'Failed donation message', 'minnpost-membership' ),
					'callback' => $callbacks['editor'],
					'page'     => 'donation_history',
					'section'  => 'donation_history',
					'args'     => array(
						'desc'          => __( 'Message to display before the table of failed donations, if there are any.', 'minnpost-membership' ),
						'constant'      => '',
						'type'          => 'text',
						'rows'          => '8',
						'media_buttons' => false,
					),
				),
				'history_success_heading'     => array(
					'title'    => __( 'Heading for successful donations', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => 'donation_history',
					'section'  => 'donation_history',
					'args'     => array(
						'type'     => 'text',
						'desc'     => __( 'Heading for successful donation table', 'minnpost-membership' ),
						'constant' => '',
					),
				),
				'history_success_message'     => array(
					'title'    => __( 'Successful donation message', 'minnpost-membership' ),
					'callback' => $callbacks['editor'],
					'page'     => 'donation_history',
					'section'  => 'donation_history',
					'args'     => array(
						'desc'          => __( 'Message to display before the list of successful donations, if there are any.', 'minnpost-membership' ),
						'constant'      => '',
						'type'          => 'text',
						'rows'          => '8',
						'media_buttons' => false,
					),
				),
			);

			foreach ( $settings as $key => $attributes ) {
				$id       = $this->option_prefix . $key;
				$name     = $this->option_prefix . $key;
				$title    = $attributes['title'];
				$callback = $attributes['callback'];
				$page     = $attributes['page'];
				$section  = $attributes['section'];
				$class    = isset( $attributes['class'] ) ? $attributes['class'] : 'minnpost-member-field ' . $id;
				$args     = array_merge(
					$attributes['args'],
					array(
						'title'     => $title,
						'id'        => $id,
						'label_for' => $id,
						'name'      => $name,
						'class'     => $class,
					)
				);

				// if there is a constant and it is defined, don't run a validate function if there is one
				if ( isset( $attributes['args']['constant'] ) && defined( $attributes['args']['constant'] ) ) {
					$validate = '';
				}
				add_settings_field( $id, $title, $callback, $page, $section, $args );
				register_setting( $section, $id );
			}
		}
	}

	/**
	* Fields for the Campaign Settings page
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param array $callbacks
	*/
	private function campaign_settings( $page, $callbacks ) {
		if ( isset( $this->get_admin_pages()[ $page ] ) ) {
			$sections = $this->get_admin_pages()[ $page ]['sections'];
			if ( ! empty( $sections ) ) {
				foreach ( $sections as $key => $value ) {
					$section = $key;
					$title   = $value;
					$page    = $section;
					add_settings_section( $section, $title, null, $page );
				}
			} else {
				$section = $page;
				$title   = $this->get_admin_pages()[ $page ]['title'];
				add_settings_section( $section, $title, null, $page );
			}

			$settings = array(
				'campaign_ids' => array(
					'title'    => __( 'Campaign IDs', 'minnpost-membership' ),
					'callback' => $callbacks['textarea'],
					'page'     => 'campaigns',
					'section'  => 'campaigns',
					'args'     => array(
						'desc'     => __( 'Enter each campaign ID that needs its own settings on a separate line.', 'minnpost-membership' ),
						'constant' => '',
						'rows'     => 10,
						'cols'     => 30,
					),
				),
			);

			$campaign_sections = $this->setup_campaign_sections();
			if ( ! empty( $campaign_sections ) ) {
				foreach ( $campaign_sections as $key => $value ) {
					$section = $key;
					$title   = 'Campaign: ' . $value;
					$page    = $section;
					add_settings_section( $section, $title, null, $page );

					if ( 'campaigns' !== $key ) {
						// campaign specific settings
						$settings[ 'support_title_' . $value ] = array(
							'title'    => __( 'Page title', 'minnpost-membership' ),
							'callback' => $callbacks['text'],
							'page'     => $key,
							'section'  => $key,
							'class'    => 'minnpost-membership-title-field',
							'args'     => array(
								'desc'     => '',
								'constant' => '',
								'type'     => 'text',
							),
						);

						$settings[ 'support_summary_' . $value ] = array(
							'title'    => __( 'Summary', 'minnpost-membership' ),
							'callback' => $callbacks['editor'],
							'page'     => $key,
							'section'  => $key,
							'args'     => array(
								'desc'          => '',
								'constant'      => '',
								'type'          => 'text',
								'rows'          => '8',
								'media_buttons' => false,
							),
						);
					}
				}
			}

			foreach ( $settings as $key => $attributes ) {
				$id       = $this->option_prefix . $key;
				$name     = $this->option_prefix . $key;
				$title    = $attributes['title'];
				$callback = $attributes['callback'];
				$page     = $attributes['page'];
				$section  = $attributes['section'];
				$class    = isset( $attributes['class'] ) ? $attributes['class'] : 'minnpost-member-field ' . $id;
				$args     = array_merge(
					$attributes['args'],
					array(
						'title'     => $title,
						'id'        => $id,
						'label_for' => $id,
						'name'      => $name,
						'class'     => $class,
					)
				);

				// if there is a constant and it is defined, don't run a validate function if there is one
				if ( isset( $attributes['args']['constant'] ) && defined( $attributes['args']['constant'] ) ) {
					$validate = '';
				}
				add_settings_field( $id, $title, $callback, $page, $section, $args );
				register_setting( $section, $id );
			}
		}
	}

	/**
	* Fields for the Explain Benefits page
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param array $callbacks
	*/
	private function explain_benefits( $page, $callbacks ) {
		if ( isset( $this->get_admin_pages()[ $page ] ) ) {
			$sections = $this->get_admin_pages()[ $page ]['sections'];
			if ( ! empty( $sections ) ) {
				foreach ( $sections as $key => $value ) {
					$section = $key;
					$title   = $value;
					$page    = $section;
					add_settings_section( $section, $title, null, $page );
				}
			} else {
				$section = $page;
				$title   = $this->get_admin_pages()[ $page ]['title'];
				add_settings_section( $section, $title, null, $page );
			}

			$settings = array(
				'explain_member_benefit_urls' => array(
					'title'    => __( 'Member benefit URLs', 'minnpost-membership' ),
					'callback' => $callbacks['textarea'],
					'page'     => 'explain_benefit_pages',
					'section'  => 'explain_benefit_pages',
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'rows'     => 5,
						'cols'     => '',
					),
				),
			);

			$benefit_sections = $this->setup_explain_benefit_page_sections();
			if ( ! empty( $benefit_sections ) ) {
				foreach ( $benefit_sections as $key => $value ) {
					$section = $key;
					$title   = $value;
					$page    = $section;
					add_settings_section( $section, $title, null, $page );
				}
			}

			// /support/partner-offers options
			$this_section                         = 'support-partner-offers';
			$settings[ $this_section . '_title' ] = array(
				'title'    => __( 'Page title', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'class'    => 'minnpost-membership-title-field',
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_body' ] = array(
				'title'    => __( 'Page body', 'minnpost-membership' ),
				'callback' => $callbacks['editor'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_eligible_levels' ] = array(
				'title'    => __( 'Eligible levels', 'minnpost-membership' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'type'     => 'select',
					'desc'     => '',
					'constant' => '',
					'items'    => $this->get_member_level_options(),
				),
			);

			$eligibility_states = $this->get_user_eligibility_states();

			$settings[ $this_section . '-user_state' ] = array(
				'title'    => __( 'Switch user state', 'minnpost-membership' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $this_section,
				'section'  => $this_section,
				'class'    => 'minnpost-member-field minnpost-member-field-user-state-toggle',
				'args'     => array(
					'type'     => 'radio',
					'label'    => 'parallel',
					'desc'     => '',
					'constant' => '',
					'items'    => $eligibility_states,
				),
			);

			// action boxes for partner offers
			foreach ( $eligibility_states as $eligibility_state ) {
				$settings[  $this_section . '_action_title_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Action title', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

				$settings[  $this_section . '_action_body_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Action body', 'minnpost-membership' ),
					'callback' => $callbacks['editor'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'          => __( '$memberlevel will show as ' . get_bloginfo( 'name' ) . ' Level with the level of the user', 'minnpost-membership' ),
						'constant'      => '',
						'type'          => 'text',
						'rows'          => '5',
						'media_buttons' => false,
					),
				);

				$settings[  $this_section . '_post_body_button_text_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Button text', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

				$settings[  $this_section . '_post_body_button_url_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Button URL', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

				$settings[  $this_section . '_post_body_link_text_next_to_button_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Link text next to button', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

				$settings[  $this_section . '_post_body_link_url_next_to_button_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Link URL next to button', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

			}

			$settings[ $this_section . '_list_all_partners' ] = array(
				'title'    => __( 'List all partners?', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'checkbox',
				),
			);

			$settings[ $this_section . '_partner_list_heading' ] = array(
				'title'    => __( 'Partner list heading', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_post_body_show_member_details_link' ] = array(
				'title'    => __( 'Show link to member benefit details page?', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'checkbox',
				),
			);

			// /support/fan-club options
			$this_section                         = 'support-fan-club';
			$settings[ $this_section . '_title' ] = array(
				'title'    => __( 'Page title', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'class'    => 'minnpost-membership-title-field',
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_body' ] = array(
				'title'    => __( 'Page body', 'minnpost-membership' ),
				'callback' => $callbacks['editor'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_eligible_levels' ] = array(
				'title'    => __( 'Eligible levels', 'minnpost-membership' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'type'     => 'select',
					'desc'     => '',
					'constant' => '',
					'items'    => $this->get_member_level_options(),
				),
			);

			$eligibility_states = $this->get_user_eligibility_states();

			$settings[ $this_section . '-user_state' ] = array(
				'title'    => __( 'Switch user state', 'minnpost-membership' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $this_section,
				'section'  => $this_section,
				'class'    => 'minnpost-member-field minnpost-member-field-user-state-toggle',
				'args'     => array(
					'type'     => 'radio',
					'label'    => 'parallel',
					'desc'     => '',
					'constant' => '',
					'items'    => $eligibility_states,
				),
			);

			// action boxes for fan club
			foreach ( $eligibility_states as $eligibility_state ) {
				$settings[  $this_section . '_action_title_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Action title', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

				$settings[  $this_section . '_action_body_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Action body', 'minnpost-membership' ),
					'callback' => $callbacks['editor'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'          => __( '$memberlevel will show as ' . get_bloginfo( 'name' ) . ' Level with the level of the user', 'minnpost-membership' ),
						'constant'      => '',
						'type'          => 'text',
						'rows'          => '5',
						'media_buttons' => false,
					),
				);

				$settings[  $this_section . '_post_body_button_text_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Button text', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

				$settings[  $this_section . '_post_body_button_url_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Button URL', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

				$settings[  $this_section . '_post_body_link_text_next_to_button_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Link text next to button', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

				$settings[  $this_section . '_post_body_link_url_next_to_button_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Link URL next to button', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

			}

			$settings[ $this_section . '_post_body_show_member_details_link' ] = array(
				'title'    => __( 'Show link to member benefit details page?', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'checkbox',
				),
			);

			// /support/member-benefit-details options
			$this_section                         = 'support-member-benefit-details';
			$settings[ $this_section . '_title' ] = array(
				'title'    => __( 'Page title', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'class'    => 'minnpost-membership-title-field',
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_body' ] = array(
				'title'    => __( 'Page body', 'minnpost-membership' ),
				'callback' => $callbacks['editor'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_link_from_other_pages' ] = array(
				'title'    => __( 'Link from other pages', 'minnpost-membership' ),
				'callback' => $callbacks['textarea'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
					'rows'     => 5,
					'cols'     => '',
				),
			);

			foreach ( $settings as $key => $attributes ) {
				$id       = $this->option_prefix . $key;
				$name     = $this->option_prefix . $key;
				$title    = $attributes['title'];
				$callback = $attributes['callback'];
				$page     = $attributes['page'];
				$section  = $attributes['section'];
				$class    = isset( $attributes['class'] ) ? $attributes['class'] : 'minnpost-member-field ' . $id;
				$args     = array_merge(
					$attributes['args'],
					array(
						'title'     => $title,
						'id'        => $id,
						'label_for' => $id,
						'name'      => $name,
						'class'     => $class,
					)
				);

				// if there is a constant and it is defined, don't run a validate function if there is one
				if ( isset( $attributes['args']['constant'] ) && defined( $attributes['args']['constant'] ) ) {
					$validate = '';
				}
				add_settings_field( $id, $title, $callback, $page, $section, $args );
				register_setting( $section, $id );
			}
		}
	}

	/**
	* Fields for the Use Benefits page
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param array $callbacks
	*/
	private function use_benefits( $page, $callbacks ) {
		if ( isset( $this->get_admin_pages()[ $page ] ) ) {
			$sections = $this->get_admin_pages()[ $page ]['sections'];
			if ( ! empty( $sections ) ) {
				foreach ( $sections as $key => $value ) {
					$section = $key;
					$title   = $value;
					$page    = $section;
					add_settings_section( $section, $title, null, $page );
				}
			} else {
				$section = $page;
				$title   = $this->get_admin_pages()[ $page ]['title'];
				add_settings_section( $section, $title, null, $page );
			}

			$settings = array(
				'use_member_benefit_urls' => array(
					'title'    => __( 'Member benefit URLs', 'minnpost-membership' ),
					'callback' => $callbacks['textarea'],
					'page'     => 'use_benefit_pages',
					'section'  => 'use_benefit_pages',
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'rows'     => 5,
						'cols'     => '',
					),
				),
			);

			$benefit_sections = $this->setup_use_benefit_page_sections();
			if ( ! empty( $benefit_sections ) ) {
				foreach ( $benefit_sections as $key => $value ) {
					$section = $key;
					$title   = $value;
					$page    = $section;
					add_settings_section( $section, $title, null, $page );
				}
			}

			// /account/benefits/partner-offers options
			$this_section                         = 'account-benefits-partner-offers';
			$settings[ $this_section . '_title' ] = array(
				'title'    => __( 'Page title', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'class'    => 'minnpost-membership-title-field',
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_claim_frequency' ] = array(
				'title'    => __( 'How often users can claim', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => __( 'Time period users have to wait between claiming offers.', 'minnpost-membership' ),
					'constant' => '',
					'type'     => 'text',
				),
			);

			$display_items = $this->get_benefit_display_items( $this_section );

			$settings[ $this_section . '-display_item' ] = array(
				'title'    => __( 'Switch display item', 'minnpost-membership' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $this_section,
				'section'  => $this_section,
				'class'    => 'minnpost-member-field minnpost-member-field-display-item-toggle',
				'args'     => array(
					'type'     => 'radio',
					'label'    => 'parallel',
					'desc'     => '',
					'constant' => '',
					'items'    => $display_items,
				),
			);

			// settings for status messages and buttons on partner offers
			foreach ( $display_items as $display_item ) {
				// email settings need to be different
				if ( 'email' !== $display_item['id'] ) {

					$text_field_args = array(
						'constant' => '',
						'type'     => 'text',
					);
					$text_field_type = $callbacks['text'];

					if ( 'status_message' === $display_item['id'] ) {
						$text_field_type                  = $callbacks['editor'];
						$text_field_args['rows']          = 5;
						$text_field_args['cols']          = 50;
						$text_field_args['media_buttons'] = false;
					}

					$text_field_args['desc'] = 'This is displayed for each offer if the current user is not logged in.';
					if ( 'button' === $display_item['id'] ) {
						$text_field_args['desc'] .= ' Clicking the button will send the user to the login page and return them to this page if they log in.';
					}
					$settings[ $this_section . '_not_logged_in_' . $display_item['id'] ] = array(
						'title'    => __( 'User is not logged in', 'minnpost-membership' ),
						'callback' => $text_field_type,
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => $text_field_args,
					);

					$text_field_args['desc'] = 'This is displayed for each offer if the current date is not in the range of claimable dates for that offer.';
					if ( 'status_message' === $display_item['id'] ) {
						$text_field_args['desc'] .= ' The $start_date, $start_time, $end_date, and $end_time values will be replaced by the claimable start date and time.';
					}
					$settings[ $this_section . '_not_claimable_yet_' . $display_item['id'] ] = array(
						'title'    => __( 'Instances not claimable yet', 'minnpost-membership' ),
						'callback' => $text_field_type,
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => $text_field_args,
					);

					$settings[ $this_section . '_user_is_eligible_' . $display_item['id'] ] = array(
						'title'    => __( 'User is eligible', 'minnpost-membership' ),
						'callback' => $text_field_type,
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => $text_field_args,
					);

					$text_field_args['desc'] = 'This is displayed for each offer if the user tried to claim a date-specific instance, but there are other instances remaining.';
					if ( 'status_message' === $display_item['id'] ) {
						$text_field_args['desc'] .= ' The $date value will be replaced by the instance date value.';
					}
					$settings[ $this_section . '_user_tried_but_this_instance_claimed_' . $display_item['id'] ] = array(
						'title'    => __( 'Chosen instance was already claimed', 'minnpost-membership' ),
						'callback' => $text_field_type,
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => $text_field_args,
					);

					$text_field_args['desc'] = 'This is displayed for each offer if the current user does not have the required status.';
					$settings[ $this_section . '_ineligible_user_' . $display_item['id'] ] = array(
						'title'    => __( 'User is ineligible', 'minnpost-membership' ),
						'callback' => $text_field_type,
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => $text_field_args,
					);

					$text_field_args['desc'] = 'This is displayed for each offer if the current user claimed an offer too recently.';
					if ( 'status_message' === $display_item['id'] ) {
						$text_field_args['desc'] .= ' The $quantity, $type, $offer, $claimed_date, and $next_claim_eligibility_date values will be replaced with the actual values.';
					}
					$settings[ $this_section . '_user_claimed_recently_' . $display_item['id'] ] = array(
						'title'    => __( 'User claimed too recently', 'minnpost-membership' ),
						'callback' => $text_field_type,
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => $text_field_args,
					);

					$text_field_args['desc'] = 'This is displayed if an offer has no available instances.';
					$settings[ $this_section . '_all_claimed_' . $display_item['id'] ] = array(
						'title'    => __( 'Offer is all claimed', 'minnpost-membership' ),
						'callback' => $text_field_type,
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => $text_field_args,
					);

					$text_field_args['desc'] = 'This is displayed if an offer has no available instances, but a user has tried to claim it. This is useful for possibly accidental button clicks or when other claims made it in sooner.';
					$settings[ $this_section . '_user_tried_but_all_claimed_' . $display_item['id'] ] = array(
						'title'    => __( 'User tried to claim offer that is all claimed', 'minnpost-membership' ),
						'callback' => $text_field_type,
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => $text_field_args,
					);

					$text_field_args['desc'] = 'This is displayed on an offer a user has previously claimed, they return to the page.';
					if ( 'status_message' === $display_item['id'] ) {
						$text_field_args['desc'] .= ' The $quantity, $type, $offer, $claimed_date, and $next_claim_eligibility_date values will be replaced with the actual values.';
					}
					$settings[ $this_section . '_user_previously_claimed_' . $display_item['id'] ] = array(
						'title'    => __( 'Previous claim', 'minnpost-membership' ),
						'callback' => $text_field_type,
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => $text_field_args,
					);

					$text_field_args['desc'] = 'This is displayed on an offer a user has just claimed.';
					$settings[ $this_section . '_user_just_claimed_' . $display_item['id'] ] = array(
						'title'    => __( 'Claim success message', 'minnpost-membership' ),
						'callback' => $text_field_type,
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => $text_field_args,
					);
				} else {
					$settings[ $this_section . '_send_email_alert_' . $display_item['id']  ] = array(
						'title'    => __( 'Send us an email alert when an offer is claimed?', 'minnpost-membership' ),
						'callback' => $callbacks['text'],
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => array(
							'desc'     => '',
							'constant' => '',
							'type'     => 'checkbox',
						),
					);

					$settings[ $this_section . '_alert_email_address_' . $display_item['id']  ] = array(
						'title'    => __( 'Where to send email alerts', 'minnpost-membership' ),
						'callback' => $callbacks['text'],
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => array(
							'desc'     => '',
							'constant' => '',
							'type'     => 'text',
						),
					);

					$settings[ $this_section . '_send_email_to_claiming_user_' . $display_item['id']  ] = array(
						'title'    => __( 'Send email to claiming user', 'minnpost-membership' ),
						'callback' => $callbacks['text'],
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => array(
							'desc'     => '',
							'constant' => '',
							'type'     => 'checkbox',
						),
					);

					$settings[ $this_section . '_email_sending_address_' . $display_item['id']  ] = array(
						'title'    => __( 'Email sending address', 'minnpost-membership' ),
						'callback' => $callbacks['text'],
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => array(
							'desc'     => '',
							'constant' => '',
							'type'     => 'text',
						),
					);

					$settings[ $this_section . '_email_sending_name_' . $display_item['id']  ] = array(
						'title'    => __( 'Email sending name', 'minnpost-membership' ),
						'callback' => $callbacks['text'],
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => array(
							'desc'     => '',
							'constant' => '',
							'type'     => 'text',
						),
					);

					$settings[ $this_section . '_subject_' . $display_item['id']  ] = array(
						'title'    => __( 'Email subject', 'minnpost-membership' ),
						'callback' => $callbacks['text'],
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => array(
							'desc'     => __( 'The subject of the email sent to claiming users.', 'minnpost-membership' ),
							'constant' => '',
							'type'     => 'text',
						),
					);

					$settings[ $this_section . '_body_' . $display_item['id']  ] = array(
						'title'    => __( 'Email body', 'minnpost-membership' ),
						'callback' => $callbacks['editor'],
						'page'     => $this_section,
						'section'  => $this_section,
						'class'    => 'minnpost-member-field minnpost-member-field-' . $display_item['id'],
						'args'     => array(
							'desc'          => __( 'The body of the email sent to claiming users. $quantity, $type, and $offer will be replaced with the actual values.', 'minnpost-membership' ),
							'constant'      => '',
							'type'          => 'text',
							'rows'          => '5',
							'media_buttons' => false,
						),
					);

				}
			}

			$settings[ $this_section . '_no_offers' ] = array(
				'title'    => __( 'No published offers', 'minnpost-membership' ),
				'callback' => $callbacks['editor'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'          => '',
					'constant'      => '',
					'type'          => 'text',
					'rows'          => '3',
					'media_buttons' => false,
				),
			);

			// /account/benefits/fan-club options
			$this_section                         = 'account-benefits-fan-club';
			$settings[ $this_section . '_title' ] = array(
				'title'    => __( 'Page title', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'class'    => 'minnpost-membership-title-field',
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_intro' ] = array(
				'title'    => __( 'Page intro', 'minnpost-membership' ),
				'callback' => $callbacks['editor'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'text',
				),
			);

			$settings[ $this_section . '_eligible_levels' ] = array(
				'title'    => __( 'Eligible levels', 'minnpost-membership' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'type'     => 'select',
					'desc'     => '',
					'constant' => '',
					'items'    => $this->get_member_level_options(),
				),
			);

			$eligibility_states = $this->get_user_eligibility_states();

			$settings[ $this_section . '-user_state' ] = array(
				'title'    => __( 'Switch user state', 'minnpost-membership' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $this_section,
				'section'  => $this_section,
				'class'    => 'minnpost-member-field minnpost-member-field-user-state-toggle',
				'args'     => array(
					'type'     => 'radio',
					'label'    => 'parallel',
					'desc'     => '',
					'constant' => '',
					'items'    => $eligibility_states,
				),
			);

			// action boxes for fan club
			foreach ( $eligibility_states as $eligibility_state ) {
				$settings[ $this_section . '_action_title_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Action title', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

				$settings[ $this_section . '_action_body_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Action body', 'minnpost-membership' ),
					'callback' => $callbacks['editor'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'          => __( '$memberlevel will show as ' . get_bloginfo( 'name' ) . ' Level with the level of the user', 'minnpost-membership' ),
						'constant'      => '',
						'type'          => 'text',
						'rows'          => '5',
						'media_buttons' => false,
					),
				);

				$settings[ $this_section . '_post_body_button_text_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Button text', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

				$settings[ $this_section . '_post_body_button_url_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Button URL', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

				$settings[ $this_section . '_post_body_link_text_next_to_button_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Link text next to button', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

				$settings[ $this_section . '_post_body_link_url_next_to_button_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Link URL next to button', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $this_section,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'     => '',
						'constant' => '',
						'type'     => 'text',
					),
				);

			}

			$settings[ $this_section . '_post_body_show_member_details_link' ] = array(
				'title'    => __( 'Show link to member benefit details page?', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $this_section,
				'section'  => $this_section,
				'args'     => array(
					'desc'     => '',
					'constant' => '',
					'type'     => 'checkbox',
				),
			);

			foreach ( $settings as $key => $attributes ) {
				$id       = $this->option_prefix . $key;
				$name     = $this->option_prefix . $key;
				$title    = $attributes['title'];
				$callback = $attributes['callback'];
				$page     = $attributes['page'];
				$section  = $attributes['section'];
				$class    = isset( $attributes['class'] ) ? $attributes['class'] : 'minnpost-member-field ' . $id;
				$args     = array_merge(
					$attributes['args'],
					array(
						'title'     => $title,
						'id'        => $id,
						'label_for' => $id,
						'name'      => $name,
						'class'     => $class,
					)
				);

				// if there is a constant and it is defined, don't run a validate function if there is one
				if ( isset( $attributes['args']['constant'] ) && defined( $attributes['args']['constant'] ) ) {
					$validate = '';
				}
				add_settings_field( $id, $title, $callback, $page, $section, $args );
				register_setting( $section, $id );
			}
		}
	}

	/**
	* Fields for the Benefit Results page
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param array $callbacks
	*/
	private function benefit_results( $page, $callbacks ) {
		if ( isset( $this->get_admin_pages()[ $page ] ) ) {
			$sections = $this->get_admin_pages()[ $page ]['sections'];
			if ( ! empty( $sections ) ) {
				foreach ( $sections as $key => $value ) {
					$section = $key;
					$title   = $value;
					$page    = $section;
					add_settings_section( $section, $title, null, $page );
				}
			} else {
				$section = $page;
				$title   = $this->get_admin_pages()[ $page ]['title'];
				add_settings_section( $section, $title, null, $page );
			}
		}

	}

	/**
	* Fields for the Premium Content page
	* This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
	*
	* @param string $page
	* @param array $callbacks
	*/
	private function premium_content( $page, $callbacks ) {
		if ( isset( $this->get_admin_pages()[ $page ] ) ) {
			$sections = $this->get_admin_pages()[ $page ]['sections'];
			if ( ! empty( $sections ) ) {
				foreach ( $sections as $key => $value ) {
					$section = $key;
					$title   = $value;
					add_settings_section( $section, $title, null, $page );
				}
			} else {
				$section = $page;
				$title   = $this->get_admin_pages()[ $page ]['title'];
				add_settings_section( $section, $title, null, $page );
			}

			$this_section = 'access_settings';
			$settings     = array(
				'post_access_meta_key' => array(
					'title'    => __( 'Post access meta key', 'minnpost-membership' ),
					'callback' => $callbacks['text'],
					'page'     => $page,
					'section'  => $this_section,
					'args'     => array(
						'type'     => 'text',
						'desc'     => '',
						'constant' => '',
					),
				),
			);

			$settings['post_access_eligible_levels'] = array(
				'title'    => __( 'Eligible levels', 'minnpost-membership' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $page,
				'section'  => $this_section,
				'args'     => array(
					'type'     => 'select',
					'desc'     => '',
					'constant' => '',
					'items'    => $this->get_member_level_options(),
				),
			);

			$settings['post_access_single_template_suffix'] = array(
				'title'    => __( 'Blocked single template suffix', 'minnpost-membership' ),
				'callback' => $callbacks['text'],
				'page'     => $page,
				'section'  => $this_section,
				'args'     => array(
					'type'     => 'text',
					'desc'     => __( 'Ex: if you put "blocked" here, the plugin will try to load the file single-blocked.php for a blocked single template call. If you leave it blank, the plugin does provide its own template (templates/blocked/single.php) that loads the messages below, if applicable. The template will have access to the $minnpost_membership and $user_state variables.', 'minnpost-membership' ),
					'constant' => '',
				),
			);

			$eligibility_states = $this->get_user_eligibility_states( true ); // this is a use screen

			$settings['post_access_user_state'] = array(
				'title'    => __( 'Switch user state', 'minnpost-membership' ),
				'callback' => $callbacks['checkboxes'],
				'page'     => $page,
				'section'  => $this_section,
				'class'    => 'minnpost-member-field minnpost-member-field-user-state-toggle',
				'args'     => array(
					'type'     => 'radio',
					'label'    => 'parallel',
					'desc'     => '',
					'constant' => '',
					'items'    => $eligibility_states,
				),
			);
			// action boxes for benefit content
			foreach ( $eligibility_states as $eligibility_state ) {
				$settings[ 'post_access_blocked_message_' . $eligibility_state['id'] ] = array(
					'title'    => __( 'Message', 'minnpost-membership' ),
					'callback' => $callbacks['editor'],
					'page'     => $page,
					'section'  => $this_section,
					'class'    => 'minnpost-member-field minnpost-member-field-' . $eligibility_state['id'],
					'args'     => array(
						'desc'          => __( '$memberlevel will show as ' . get_bloginfo( 'name' ) . ' Level with the level of the user', 'minnpost-membership' ),
						'constant'      => '',
						'type'          => 'text',
						'rows'          => '10',
						'media_buttons' => false,
					),
				);
			}

			foreach ( $settings as $key => $attributes ) {
				$id       = $this->option_prefix . $key;
				$name     = $this->option_prefix . $key;
				$title    = $attributes['title'];
				$callback = $attributes['callback'];
				$page     = $attributes['page'];
				$section  = $attributes['section'];
				$class    = isset( $attributes['class'] ) ? $attributes['class'] : 'minnpost-member-field ' . $id;
				$args     = array_merge(
					$attributes['args'],
					array(
						'title'     => $title,
						'id'        => $id,
						'label_for' => $id,
						'name'      => $name,
						'class'     => $class,
					)
				);

				// if there is a constant and it is defined, don't run a validate function if there is one
				if ( isset( $attributes['args']['constant'] ) && defined( $attributes['args']['constant'] ) ) {
					$validate = '';
				}
				add_settings_field( $id, $title, $callback, $page, $section, $args );
				register_setting( $section, $id );
			}
		}
	}

	/**
	* Set up options tab for each payment page URL in the options
	*
	* @return $array $sections
	*
	*/
	private function setup_payment_page_sections() {
		$sections = array(
			'payment_pages' => __( 'Payment Pages', 'minnpost-membership' ),
		);

		$urls     = get_option( $this->option_prefix . 'payment_urls', array() );
		$sections = $this->generate_sections( $sections, $urls );

		return $sections;
	}

	/**
	* Set up options tab for each campaign ID in the options
	*
	* @return $array $sections
	*
	*/
	private function setup_campaign_sections() {
		$sections = array(
			'campaigns' => __( 'Campaigns', 'minnpost-membership' ),
		);

		$campaign_ids = get_option( $this->option_prefix . 'campaign_ids', array() );
		if ( ! empty( $campaign_ids ) ) {
			$campaign_ids = explode( "\r\n", $campaign_ids );
			foreach ( $campaign_ids as $key => $value ) {
				$key = $key + 1;

				$sections[ 'campaign_' . $key ] = $value;
			}
		}

		return $sections;
	}

	/**
	* Set up options tab for each explain benefit page URL in the options
	*
	* @return $array $sections
	*
	*/
	private function setup_explain_benefit_page_sections() {
		$sections = array(
			'explain_benefit_pages' => __( 'Member Benefit Pages', 'minnpost-membership' ),
		);

		$urls     = get_option( $this->option_prefix . 'explain_member_benefit_urls', array() );
		$sections = $this->generate_sections( $sections, $urls );

		return $sections;
	}

	/**
	* Set up options tab for each use benefit page URL in the options
	*
	* @return array $sections
	*
	*/
	private function setup_use_benefit_page_sections() {
		$sections = array(
			'use_benefit_pages' => __( 'Member Benefit Pages', 'minnpost-membership' ),
		);

		$urls     = get_option( $this->option_prefix . 'use_member_benefit_urls', array() );
		$sections = $this->generate_sections( $sections, $urls );

		return $sections;
	}

	/**
	* Add the option URLs individually to the option tabs for benefit pages
	*
	* @param array $sections
	* @param array $urls
	* @return $array $sections
	*
	*/
	private function generate_sections( $sections, $urls = array() ) {
		if ( ! empty( $urls ) ) {
			$urls = explode( "\r\n", $urls );
			foreach ( $urls as $url ) {
				$url       = ltrim( $url, '/' );
				$url_array = explode( '/', $url );
				if ( ! isset( $url_array[1] ) && ! isset( $url_array[2] ) ) {
					$url   = $url_array[0];
					$title = ucwords( str_replace( '-', ' ', $url_array[0] ) );
				} elseif ( isset( $url_array[1] ) && ! isset( $url_array[2] ) ) {
					$url   = $url_array[0] . '-' . $url_array[1];
					$title = ucwords( str_replace( '-', ' ', $url_array[1] ) );
				} elseif ( isset( $url_array[1] ) && isset( $url_array[2] ) ) {
					$url   = $url_array[0] . '-' . $url_array[1] . '-' . $url_array[2];
					$title = ucwords( str_replace( '-', ' ', $url_array[2] ) );
				}
				$sections[ $url ] = $title;
			}
		}
		return $sections;
	}

	/**
	* Setting options for picking a member level
	* @return array $options
	*
	*/
	private function get_member_level_options() {
		$member_levels = $this->member_levels->get_member_levels( '', false, 'id', true );
		$options       = array();
		foreach ( $member_levels as $member_level ) {
			$options[] = array(
				'id'      => $member_level['slug'],
				'value'   => $member_level['slug'],
				'text'    => $member_level['name'],
				'desc'    => '',
				'default' => '',
			);
		}
		return $options;
	}

	/**
	* Get eligible levels for benefit
	* @return array $options
	*
	*/
	private function get_benefit_eligibility_levels( $benefit = '' ) {
		$member_levels = $this->member_levels->get_member_levels();
		$options       = array();
		foreach ( $member_levels as $member_level ) {
			$options[] = array(
				'id'      => $member_level['slug'],
				'value'   => $member_level['slug'],
				'text'    => $member_level['name'],
				'desc'    => '',
				'default' => '',
			);
		}
		return $options;
	}

	/**
	* Options for what states can apply to a user's eligibility
	* @param bool $use - if this is true, skip the "member eligible" because the user is able to do the task they're trying to do
	* @return array $admin_states
	*
	*/
	private function get_user_eligibility_states( $use = false ) {
		// states a user can have
		$eligibility_states = $this->user_info->eligibility_states;
		$admin_states       = array();
		foreach ( $eligibility_states as $key => $value ) {
			if ( true === $use ) {
				if ( 'member_eligible' === $key ) {
					continue;
				}
			}
			$admin_states[] = array(
				'value'   => $key,
				'text'    => $value,
				'id'      => $key,
				'desc'    => '',
				'default' => '',
			);
		}
		return $admin_states;
	}

	/**
	* Options for what items can group the display
	* @param string $benefit_name - sets the displays based on the benefit name
	* @return array $display_states
	*
	*/
	private function get_benefit_display_items( $benefit_name ) {
		// items a display can have
		$display_items = array();
		if ( 'account-benefits-partner-offers' === $benefit_name ) {
			$display_items = array(
				array(
					'value'   => 'status_message',
					'text'    => 'Status messages',
					'id'      => 'status_message',
					'desc'    => '',
					'default' => '',
				),
				array(
					'value'   => 'button',
					'text'    => 'Buttons',
					'id'      => 'button',
					'desc'    => '',
					'default' => '',
				),
				array(
					'value'   => 'email',
					'text'    => 'Emails',
					'id'      => 'email',
					'desc'    => '',
					'default' => '',
				),
			);
		}
		return $display_items;
	}

	/**
	* Prepare member level data and redirect after processing
	* This runs when the create or update forms are submitted
	* It is public because it depends on an admin hook
	* It then calls the MinnPost_Membership_Member_Level class and sends prepared data over to it, then redirects to the correct page
	* This method does include error handling, by loading the submission in a transient if there is an error, and then deleting it upon success
	*
	*/
	public function prepare_member_level_data() {
		$error     = false;
		$post_data = $_POST;
		$cachekey  = md5( wp_json_encode( $post_data ) );

		if ( ! isset( $post_data['name'] ) || ! isset( $post_data['benefits'] ) ) {
			$error = true;
		}

		if ( true === $error ) {
			$this->mp_mem_transients->set( $cachekey, $post_data );
			if ( '' !== $cachekey ) {
				$url = esc_url_raw( $post_data['redirect_url_error'] ) . '&transient=' . $cachekey;
			}
		} else { // there are no errors
			// send the row to the fieldmap class
			// if it is add or clone, use the create method
			$method = esc_attr( $post_data['method'] );
			if ( 'add-member-level' === $method ) {
				$result = $this->member_levels->create_member_level( $post_data );
			} elseif ( 'edit-member-level' === $method ) { // if it is edit, use the update method
				$id     = esc_attr( $post_data['id'] );
				$result = $this->member_levels->update_member_level( $post_data, $id );
			}
			if ( false === $result ) { // if the database didn't save, it's still an error
				$this->mp_mem_transients->set( $cachekey, $post_data );
				if ( '' !== $cachekey ) {
					$url = esc_url_raw( $post_data['redirect_url_error'] ) . '&transient=' . $cachekey;
				}
			} else {
				if ( isset( $post_data['transient'] ) ) { // there was previously an error saved. can delete it now.
					$this->mp_mem_transients->delete( esc_attr( $post_data['transient'] ) );
				}
				// then send the user to the list of fieldmaps
				$url = esc_url_raw( $post_data['redirect_url_success'] );
			}
		}
		wp_safe_redirect( $url );
		exit();
	}

	/**
	* Delete member level data and redirect after processing
	* This runs when the delete link is clicked, after the user confirms
	* It is public because it depends on an admin hook
	* It then calls the MinnPost_Membership_Member_Level class and the delete method
	*
	*/
	public function delete_member_level() {
		$post_data = filter_input_array( INPUT_POST, FILTER_SANITIZE_STRING );
		if ( $post_data['id'] ) {
			$result = $this->member_levels->delete_member_level( $post_data['id'] );
			if ( true === $result ) {
				$url = esc_url_raw( $post_data['redirect_url_success'] );
			} else {
				$url = esc_url_raw( $post_data['redirect_url_error'] . '&id=' . $post_data['id'] );
			}
			wp_safe_redirect( $url );
			exit();
		}
	}

	/**
	* Call this method on all the url option fields, so we can flush the rewrite rules when they get updated
	*
	* @param string $new_value
	* @param string $old_value
	* @return string $new_value
	*
	*/
	public function url_option_updated( $new_value, $old_value ) {
		if ( $new_value !== $old_value && ! empty( $new_value ) ) {
			flush_rewrite_rules();
		}
		return $new_value;
	}

	/**
	* Call this method on the campaign id field so we can clear out old options
	*
	* @param string $new_value
	* @param string $old_value
	* @return string $new_value
	*
	*/
	public function campaign_ids_updated( $new_value, $old_value ) {
		if ( $new_value !== $old_value ) {
			$new_ids = explode( "\r\n", $new_value );
			$old_ids = explode( "\r\n", $old_value );
			foreach ( $old_ids as $key => $value ) {
				if ( ! in_array( $value, $new_ids ) ) {
					// clear out options if the old id is no longer in the list of campaigns
					delete_option( $this->option_prefix . 'support_title_' . $value );
					delete_option( $this->option_prefix . 'support_summary_' . $value );
				}
			}
		}
		return $new_value;
	}

	/**
	* For editors where we need to change the settings, do it
	*
	* @param array $init
	* @param string $editor_id
	*
	*/
	public function editor_settings( $init, $editor_id ) {
		$eligibility_states = $this->get_user_eligibility_states( true ); // this is a use screen
		foreach ( $eligibility_states as $eligibility_state ) {
			if ( 'post_access_blocked_message_' . $eligibility_state['id'] === $editor_id ) {
				$init['wpautop']            = false;
				$init['forced_root_blocks'] = false;
				$init['force_p_newlines']   = false;
				$init['force_br_newlines']  = true;
			}
		}
		// Pass $init back to WordPress
		return $init;
		// post_access_blocked_message_' . $eligibility_state['id'] is the editor id
	}

	private function get_partners( $partner_id = '' ) {
		$partners = $this->content_items->get_partners( $partner_id );
		return $partners;
	}

	/**
	* Default display for <input> fields
	*
	* @param array $args
	*/
	public function display_input_field( $args ) {
		$type    = $args['type'];
		$id      = $args['label_for'];
		$name    = $args['name'];
		$desc    = $args['desc'];
		$checked = '';

		$class = 'regular-text';

		if ( 'checkbox' === $type ) {
			$class = 'checkbox';
		}

		if ( ! isset( $args['constant'] ) || ! defined( $args['constant'] ) ) {
			$value = esc_attr( get_option( $id, '' ) );
			if ( 'checkbox' === $type ) {
				if ( '1' === $value ) {
					$checked = 'checked ';
				}
				$value = 1;
			}
			if ( '' === $value && isset( $args['default'] ) && '' !== $args['default'] ) {
				$value = $args['default'];
			}

			echo sprintf( '<input type="%1$s" value="%2$s" name="%3$s" id="%4$s" class="%5$s"%6$s>',
				esc_attr( $type ),
				esc_attr( $value ),
				esc_attr( $name ),
				esc_attr( $id ),
				sanitize_html_class( $class . esc_html( ' code' ) ),
				esc_html( $checked )
			);
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
		} else {
			echo sprintf( '<p><code>%1$s</code></p>',
				esc_html__( 'Defined in wp-config.php', 'minnpost-membership' )
			);
		}
	}

	/**
	* Display for multiple checkboxes
	* Above method can handle a single checkbox as it is
	*
	* @param array $args
	*/
	public function display_checkboxes( $args ) {
		$type = 'checkbox';
		if ( 'radio' === $args['type'] ) {
			$type = 'radio';
		}

		$name       = $args['name'];
		$group_desc = $args['desc'];
		$options    = get_option( $name, array() );

		foreach ( $args['items'] as $key => $value ) {
			$text = $value['text'];
			$id   = $value['id'];
			$desc = $value['desc'];
			if ( isset( $value['value'] ) ) {
				$item_value = $value['value'];
			} else {
				$item_value = $key;
			}
			$checked = '';
			if ( is_array( $options ) && in_array( (string) $item_value, $options, true ) ) {
				$checked = 'checked';
			} elseif ( is_array( $options ) && empty( $options ) ) {
				if ( isset( $value['default'] ) && true === $value['default'] ) {
					$checked = 'checked';
				}
			}

			$input_name = $name;

			if ( ! isset( $args['label'] ) || 'parallel' !== $args['label'] ) {
				echo sprintf( '<div class="checkbox"><label><input type="%1$s" value="%2$s" name="%3$s[]" id="%4$s"%5$s>%6$s</label></div>',
					esc_attr( $type ),
					esc_attr( $item_value ),
					esc_attr( $input_name ),
					esc_attr( $id ),
					esc_html( $checked ),
					esc_html( $text )
				);
			} else {
				echo sprintf( '<div class="checkbox"><input type="%1$s" value="%2$s" name="%3$s[]" id="%4$s"%5$s><label for="%4$s">%6$s</label></div>',
					esc_attr( $type ),
					esc_attr( $item_value ),
					esc_attr( $input_name ),
					esc_attr( $id ),
					esc_html( $checked ),
					esc_html( $text )
				);
			}
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
		}

		if ( '' !== $group_desc ) {
			echo sprintf( '<p class="description">%1$s</p>',
				esc_html( $group_desc )
			);
		}

	}

	/**
	* Display for a dropdown/select
	*
	* @param array $args
	*/
	public function display_select( $args ) {
		$type = $args['type'];
		$id   = $args['label_for'];
		$name = $args['name'];
		$desc = $args['desc'];
		if ( ! isset( $args['constant'] ) || ! defined( $args['constant'] ) ) {
			$current_value = get_option( $name );

			echo sprintf( '<div class="select"><select id="%1$s" name="%2$s"><option value="">- Select one -</option>',
				esc_attr( $id ),
				esc_attr( $name )
			);

			foreach ( $args['items'] as $key => $value ) {
				$text     = $value['text'];
				$value    = $value['value'];
				$selected = '';
				if ( $key === $current_value || $value === $current_value ) {
					$selected = ' selected';
				}

				echo sprintf( '<option value="%1$s"%2$s>%3$s</option>',
					esc_attr( $value ),
					esc_attr( $selected ),
					esc_html( $text )
				);

			}
			echo '</select>';
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
			echo '</div>';
		} else {
			echo sprintf( '<p><code>%1$s</code></p>',
				esc_html__( 'Defined in wp-config.php', 'minnpost-membership' )
			);
		}
	}

	/**
	* Display for a dropdown/select
	*
	* @param array $args
	*/
	public function display_textarea( $args ) {
		$id    = $args['label_for'];
		$name  = $args['name'];
		$desc  = $args['desc'];
		$rows  = $args['rows'];
		$cols  = $args['cols'];
		$class = 'regular-text';
		if ( ! isset( $args['constant'] ) || ! defined( $args['constant'] ) ) {
			$value = esc_attr( get_option( $id, '' ) );
			if ( '' === $value && isset( $args['default'] ) && '' !== $args['default'] ) {
				$value = $args['default'];
			}

			if ( '' !== $rows ) {
				$rows_attr = ' rows="' . esc_attr( $rows ) . '"';
			} else {
				$rows_attr = '';
			}

			if ( '' !== $cols ) {
				$cols_attr = ' cols="' . esc_attr( $cols ) . '"';
			} else {
				$cols_attr = '';
			}

			echo sprintf( '<textarea name="%1$s" id="%2$s" class="%3$s"%4$s%5$s>%6$s</textarea>',
				esc_attr( $name ),
				esc_attr( $id ),
				sanitize_html_class( $class . esc_html( ' code' ) ),
				$rows_attr,
				$cols_attr,
				esc_attr( $value )
			);
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
		} else {
			echo sprintf( '<p><code>%1$s</code></p>',
				esc_html__( 'Defined in wp-config.php', 'minnpost-membership' )
			);
		}
	}

	/**
	* Display for a wysiwyg editir
	*
	* @param array $args
	*/
	public function display_editor( $args ) {
		$id      = $args['label_for'];
		$name    = $args['name'];
		$desc    = $args['desc'];
		$checked = '';

		$class = 'regular-text';

		if ( ! isset( $args['constant'] ) || ! defined( $args['constant'] ) ) {
			$value = wp_kses_post( get_option( $id, '' ) );
			if ( '' === $value && isset( $args['default'] ) && '' !== $args['default'] ) {
				$value = $args['default'];
			}

			$settings = array();
			if ( isset( $args['wpautop'] ) ) {
				$settings['wpautop'] = $args['wpautop'];
			}
			if ( isset( $args['media_buttons'] ) ) {
				$settings['media_buttons'] = $args['media_buttons'];
			}
			if ( isset( $args['default_editor'] ) ) {
				$settings['default_editor'] = $args['default_editor'];
			}
			if ( isset( $args['drag_drop_upload'] ) ) {
				$settings['drag_drop_upload'] = $args['drag_drop_upload'];
			}
			if ( isset( $args['name'] ) ) {
				$settings['textarea_name'] = $args['name'];
			}
			if ( isset( $args['rows'] ) ) {
				$settings['textarea_rows'] = $args['rows']; // default is 20
			}
			if ( isset( $args['tabindex'] ) ) {
				$settings['tabindex'] = $args['tabindex'];
			}
			if ( isset( $args['tabfocus_elements'] ) ) {
				$settings['tabfocus_elements'] = $args['tabfocus_elements'];
			}
			if ( isset( $args['editor_css'] ) ) {
				$settings['editor_css'] = $args['editor_css'];
			}
			if ( isset( $args['editor_class'] ) ) {
				$settings['editor_class'] = $args['editor_class'];
			}
			if ( isset( $args['teeny'] ) ) {
				$settings['teeny'] = $args['teeny'];
			}
			if ( isset( $args['dfw'] ) ) {
				$settings['dfw'] = $args['dfw'];
			}
			if ( isset( $args['tinymce'] ) ) {
				$settings['tinymce'] = $args['tinymce'];
			}
			if ( isset( $args['quicktags'] ) ) {
				$settings['quicktags'] = $args['quicktags'];
			}

			wp_editor( $value, $id, $settings );
			if ( '' !== $desc ) {
				echo sprintf( '<p class="description">%1$s</p>',
					esc_html( $desc )
				);
			}
		} else {
			echo sprintf( '<p><code>%1$s</code></p>',
				esc_html__( 'Defined in wp-config.php', 'minnpost-membership' )
			);
		}
	}

	/**
	* Default display for <a href> links
	*
	* @param array $args
	*/
	public function display_link( $args ) {
		$label = $args['label'];
		$desc  = $args['desc'];
		$url   = $args['url'];
		if ( isset( $args['link_class'] ) ) {
			echo sprintf( '<p><a class="%1$s" href="%2$s">%3$s</a></p>',
				esc_attr( $args['link_class'] ),
				esc_url( $url ),
				esc_html( $label )
			);
		} else {
			echo sprintf( '<p><a href="%1$s">%2$s</a></p>',
				esc_url( $url ),
				esc_html( $label )
			);
		}

		if ( '' !== $desc ) {
			echo sprintf( '<p class="description">%1$s</p>',
				esc_html( $desc )
			);
		}

	}

}
