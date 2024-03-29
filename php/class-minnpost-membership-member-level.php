<?php
/**
 * Class file for the MinnPost_Membership_Member_Level class.
 *
 * @file
 */

if ( ! class_exists( 'MinnPost_Membership' ) ) {
	die();
}

/**
 * Member levels
 */
class MinnPost_Membership_Member_Level {

	public $option_prefix;
	public $file;
	public $version;
	public $slug;
	public $cache;

	public $member_level_prefix;

	/**
	* Constructor which sets up member levels
	*
	*/
	public function __construct() {

		$this->option_prefix = minnpost_membership()->option_prefix;
		$this->file          = minnpost_membership()->file;
		$this->version       = minnpost_membership()->version;
		$this->slug          = minnpost_membership()->slug;
		$this->cache         = minnpost_membership()->cache;

		$this->member_level_prefix = 'member_';

		//$this->add_actions();

	}

	/**
	* Do actions
	*
	*/
	private function add_actions() {

	}

	/**
	* Get all, or one, of the member levels
	*
	* @param  string  $value
	* @param  boool   $show_nonmember
	* @param  string  $field
	* @return array $member_levels
	*
	*/
	public function get_member_levels( $value = '', $show_nonmember = false, $field = 'id', $reset = false ) {
		$member_levels = get_option( $this->option_prefix . 'member_levels', array() );
		$member_levels = (array) $member_levels;
		if ( true !== $show_nonmember ) {
			$key = array_search( '1', array_column( $member_levels, 'is_nonmember' ) );
			unset( $member_levels[ $key ] );
		}

		$member_status  = array_column( $member_levels, 'is_nonmember' );
		$minimum_amount = array_column( $member_levels, 'minimum_monthly_amount' );
		array_multisort( $member_status, SORT_DESC, $minimum_amount, SORT_ASC, $member_levels );

		if ( is_array( $value ) ) {
			return $value;
		}

		$call = $field . '=' . $value . 'show_nonmember=' . $show_nonmember;

		$cached = $this->cache->cache_get( $call, $reset );
		if ( is_array( $cached ) ) {
			$member_levels = $cached;
		} else {
			$cached = $this->cache->cache_set( $call, $member_levels );
		}

		if ( '' !== $value ) {
			if ( 'id' === $field ) {
				return $member_levels[ $value ];
			} else {
				$key = array_search( $value, array_column( $member_levels, $field ) );
				return $member_levels[ $key ];
			}
		}
		return $member_levels;
	}

	/**
	* Get default member leel
	* @return string $default
	*
	*/
	public function get_default_member_level() {
		$default = get_option( $this->option_prefix . 'support-member-benefits_default_level', 'member_silver' );
		return $default;
	}

	/**
	* Array of options for frequencies. This is used in admin, but also elsewhere.
	*
	* @param string $key
	* @param string $value
	* @return array $options
	*
	*/
	public function get_frequency_options( $key = '', $field = 'value' ) {
		$frequencies = array(
			array(
				'id'      => 'monthly',
				'value'   => 'per month - 12',
				'text'    => __( 'monthly', 'minnpost-membership' ),
				'desc'    => '',
				'default' => '',
			),
			array(
				'id'      => 'yearly',
				'value'   => 'per year - 1',
				'text'    => __( 'yearly', 'minnpost-membership' ),
				'desc'    => '',
				'default' => '',
			),
			array(
				'id'      => 'one-time',
				'value'   => 'one-time - 1',
				'text'    => __( 'one time', 'minnpost-membership' ),
				'desc'    => '',
				'default' => '',
			),
		);
		if ( '' !== $key ) {
			$search_result = array_search( $key, array_column( $frequencies, $field ), true );
			if ( false !== $search_result ) {
				return $frequencies[ $search_result ];
			} else {
				return $search_result;
			}
		}
		return $frequencies;
	}

	/**
	* Get name and times per year for a given frequency value
	*
	* @param string $value
	* @return array $frequencyvalues
	*
	*/
	public function get_frequency_values( $value ) {
		$splitdefault  = explode( 'per ', $value );
		$splitdefault  = end( $splitdefault );
		$defaultvalues = explode( ' - ', $splitdefault );

		$name   = $defaultvalues[0]; // returns 'month' 'year' or 'one-time'
		$number = $defaultvalues[1]; // returns 12 or 1

		$frequencyvalues = array(
			'frequency_name' => $name,
			'times_per_year' => $number,
		);
		return $frequencyvalues;
	}

	/**
	* Get text label for a given frequency value
	*
	* @param string $value
	* @param string $field
	* @return string $text_label
	*
	*/
	public function get_frequency_text_label( $value, $field = 'id' ) {
		$frequency_id = $this->get_frequency_options( $value, $field )['id'];
		$text_label   = get_option( $this->option_prefix . $frequency_id . '_text_label', '' );
		return $text_label;
	}

	/**
	* Get button label for a given frequency value
	*
	* @param string $frequency_id
	* @param string $default
	* @return string $button_label
	*
	*/
	public function get_frequency_button_label( $frequency_id, $default = '' ) {
		$default      = ucwords( $default );
		$button_label = get_option( $this->option_prefix . $frequency_id . '_button_text_label', $default );
		if ( '' === $button_label ) {
			return $default;
		}
		return $button_label;
	}

	/**
	* Get suggested monthly, yearly, and one-time amounts
	*
	* @param string $value
	* @return array $frequencyvalues
	*
	*/
	public function get_suggested_amounts() {
		$frequency_options = $this->get_frequency_options();
		$suggested_amounts = array();
		foreach ( $frequency_options as $option ) {
			$frequency                       = $option['id'];
			$suggested_amounts[ $frequency ] = get_option( $this->option_prefix . 'support_suggested_amounts_' . $frequency );
		}

		// Sort suggested amounts in descending order
		foreach ( $suggested_amounts as $frequency => &$amounts ) {
			usort(
				$amounts,
				function ( $a, $b ) {
					$amta = intval( $a['amount'] );
					$amtb = intval( $b['amount'] );
					if ( $amta === $amtb ) {
						return 0;
					}
					return ( $amta > $amtb ) ? -1 : 1;
				}
			);
		}

		return $suggested_amounts;
	}

	/**
	* Calculate price ranges for member levels
	*
	* @param array $record
	* @return string $range
	*
	*/
	public function calculate_ranges( $record = '' ) {
		if ( '' === get_option( $this->option_prefix . 'default_frequency', '' ) ) {
			return;
		}
		$default_frequency = $this->get_frequency_values( get_option( $this->option_prefix . 'default_frequency', '' )[0] );
		if ( 1 === $record['minimum_monthly_amount'] && '' !== $record['maximum_monthly_amount'] ) {
			$record['maximum_monthly_amount'] = $record['maximum_monthly_amount'] + 1;
		}

		if ( 'month' === $default_frequency['frequency_name'] ) {
			$minimum_monthly = is_numeric( $record['minimum_monthly_amount'] ) ? $record['minimum_monthly_amount'] : '';
			$maximum_monthly = is_numeric( $record['maximum_monthly_amount'] ) ? $record['maximum_monthly_amount'] : '';
			$default_monthly = is_numeric( $record['starting_value'] ) ? $record['starting_value'] : '';
			$minimum_annual  = is_numeric( $record['minimum_monthly_amount'] ) ? $record['minimum_monthly_amount'] * $default_frequency['times_per_year'] : '';
			$maximum_annual  = is_numeric( $record['maximum_monthly_amount'] ) ? $record['maximum_monthly_amount'] * $default_frequency['times_per_year'] : '';
			$default_annual  = is_numeric( $record['starting_value'] ) ? $record['starting_value'] * $default_frequency['times_per_year'] : '';
		} else {
			$minimum_monthly = $record['minimum_monthly_amount'] / $default_frequency['times_per_year'];
			$maximum_monthly = $record['maximum_monthly_amount'] / $default_frequency['times_per_year'];
			$default_monthly = $record['starting_value'] / $default_frequency['starting_value'];
			$minimum_annual  = $record['minimum_monthly_amount'];
			$maximum_annual  = $record['maximum_monthly_amount'];
			$default_annual  = $record['starting_value'];
		}
		$range = array();
		if ( 1 !== $minimum_monthly && '' !== $maximum_monthly ) {
			$range = array(
				'yearly'  => esc_html( '$' ) . $minimum_annual . esc_html( '-' ) . esc_html( '$' ) . $maximum_annual,
				'monthly' => esc_html( '$' ) . $minimum_monthly . esc_html( '-' ) . esc_html( '$' ) . $maximum_monthly,
			);
		} elseif ( '' !== $maximum_monthly ) {
			$range = array(
				'yearly'  => esc_html( '<$' ) . $maximum_annual,
				'monthly' => esc_html( '<$' ) . $maximum_monthly,
			);
		} elseif ( 1 !== $minimum_monthly ) {
			$range = array(
				'yearly'  => esc_html( '$' ) . $minimum_annual . esc_html( '+' ),
				'monthly' => esc_html( '$' ) . $minimum_monthly . esc_html( '+' ),
			);
		}
		$range['default_monthly'] = esc_attr( $default_monthly );
		$range['default_yearly']  = esc_attr( $default_annual );
		return $range;
	}

	/**
	* Calculate level for an amount/frequency
	*
	* @param int $amount
	* @param string $frequency
	* @param string $key
	* @param int $amount_per_year
	* @return string $range
	*
	*/
	public function calculate_level( $amount = '', $frequency = 'one-time', $key = 'id', $amount_per_year = 0 ) {
		$level = '';
		if ( '' === $frequency ) {
			$frequency = 'one-time';
		}
		$frequency  = $this->get_frequency_options( $frequency, $key )['value'];
		$all_levels = $this->get_member_levels();
		if ( 0 === $amount_per_year ) {
			$times_per_year = $this->get_frequency_values( $frequency )['times_per_year'];
			$monthly_amount = floor( ( $amount * $times_per_year ) / 12 );
		} else {
			$monthly_amount = floor( $amount_per_year / 12 );
		}

		foreach ( $all_levels as $level ) {

			$minimum_monthly = $level['minimum_monthly_amount'];
			$maximum_monthly = $level['maximum_monthly_amount'];

			if ( '' === $maximum_monthly ) {
				if ( $monthly_amount < $minimum_monthly ) {
					continue;
				} else {
					$level = $level['slug'];
					return $level;
				}
			} else {
				if ( ( $monthly_amount < $minimum_monthly ) || ( $monthly_amount > $maximum_monthly ) ) {
					continue;
				} else {
					$level = $level['slug'];
					return $level;
				}
			}
		}
		return $level;
	}

	/**
	* Create a member level
	*
	* @param array $post_data
	* @return bool $result
	*
	*/
	public function create_member_level( $post_data ) {
		$member_levels   = get_option( $this->option_prefix . 'member_levels', array() );
		$data            = $this->setup_member_level_data( $post_data );
		$member_levels[] = $data;
		usort(
			$member_levels,
			function( $a, $b ) {
				if ( ! isset( $b['is_nonmember'] ) || 1 !== intval( $b['is_nonmember'] ) ) {
					return intval( $b['minimum_monthly_amount'] ) < intval( $a['minimum_monthly_amount'] );
				}
			}
		);
		$result = update_option( $this->option_prefix . 'member_levels', $member_levels );
		if ( true === $result ) {
			return true;
		} else {
			return false;
		}
	}

	/**
	* Update a member level
	*
	* @param array $post_data
	* @param int   $id
	* @return bool $result
	*
	*/
	public function update_member_level( $post_data, $id ) {
		$member_levels        = get_option( $this->option_prefix . 'member_levels', array() );
		$data                 = $this->setup_member_level_data( $post_data );
		$member_levels[ $id ] = $data;
		usort(
			$member_levels,
			function( $a, $b ) {
				if ( ! isset( $b['is_nonmember'] ) || 1 !== intval( $b['is_nonmember'] ) ) {
					return intval( $b['minimum_monthly_amount'] ) < intval( $a['minimum_monthly_amount'] );
				}
			}
		);
		$result = update_option( $this->option_prefix . 'member_levels', $member_levels );
		if ( true === $result ) {
			return true;
		} else {
			return false;
		}
	}

	/**
	* Delete a member level
	*
	* @param int   $id
	* @return bool $result
	*
	*/
	public function delete_member_level( $id ) {
		$member_levels = get_option( $this->option_prefix . 'member_levels', array() );
		unset( $member_levels[ $id ] );
		usort(
			$member_levels,
			function( $a, $b ) {
				if ( ! isset( $b['is_nonmember'] ) || 1 !== intval( $b['is_nonmember'] ) ) {
					return intval( $b['minimum_monthly_amount'] ) < intval( $a['minimum_monthly_amount'] );
				}
			}
		);
		$result = update_option( $this->option_prefix . 'member_levels', $member_levels );
		if ( true === $result ) {
			return true;
		} else {
			return false;
		}
	}

	/**
	* Setup for member level data
	*
	* @param array $post_data
	* @return array $data
	*
	*/
	private function setup_member_level_data( $data ) {
		if ( ! isset( $data['is_nonmember'] ) || 1 !== intval( $data['is_nonmember'] ) ) {
			$prefix = $this->member_level_prefix;
		} else {
			$prefix = '';
		}
		$data = array(
			'slug'                   => $prefix . sanitize_title( $data['name'] ),
			'name'                   => sanitize_text_field( $data['name'] ),
			'is_nonmember'           => isset( $data['is_nonmember'] ) ? esc_attr( $data['is_nonmember'] ) : 0,
			'minimum_monthly_amount' => ( isset( $data['minimum_monthly_amount'] ) && '' !== $data['minimum_monthly_amount'] ) ? intval( $data['minimum_monthly_amount'] ) : 1,
			'maximum_monthly_amount' => ( isset( $data['maximum_monthly_amount'] ) && '' !== $data['maximum_monthly_amount'] ) ? intval( $data['maximum_monthly_amount'] ) : '',
			'starting_value'         => ( isset( $data['starting_value'] ) && '' !== $data['starting_value'] ) ? intval( $data['starting_value'] ) : 0,
			'benefits'               => wp_kses_post( $data['benefits'] ),
		);
		return $data;
	}

}
