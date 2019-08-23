"use strict";

;

(function (window) {
  function MinnPostMembership(data, settings) {
    this.data = {};

    if (typeof data !== 'undefined') {
      this.data = data;
    }

    this.settings = {};

    if (typeof settings !== 'undefined') {
      this.settings = settings;
    }

    this.previousAmount = '';

    if (typeof this.data.current_user !== 'undefined' && typeof this.data.current_user.previous_amount !== 'undefined') {
      this.previousAmount = this.data.current_user.previous_amount;
    }
  }

  MinnPostMembership.prototype = {
    checkLevel: function checkLevel(amount, frequency, type) {
      var thisyear = parseInt(amount) * parseInt(frequency);

      if (typeof this.previousAmount !== 'undefined' && this.previousAmount !== '') {
        var prior_year_amount = parseInt(this.previousAmount.prior_year_contributions, 10);
        var coming_year_amount = parseInt(this.previousAmount.coming_year_contributions, 10);
        var annual_recurring_amount = parseInt(this.previousAmount.annual_recurring_amount, 10); // calculate member level formula

        if (type === 'one-time') {
          prior_year_amount += thisyear;
        } else {
          annual_recurring_amount += thisyear;
        }

        thisyear = Math.max(prior_year_amount, coming_year_amount, annual_recurring_amount);
      }

      return this.getLevel(thisyear);
    },
    // end checkLevel
    getLevel: function getLevel(thisyear) {
      var level = {
        'yearlyAmount': thisyear
      };

      if (thisyear > 0 && thisyear < 60) {
        level['name'] = 'Bronze';
        level['number'] = 1;
      } else if (thisyear > 59 && thisyear < 120) {
        level['name'] = 'Silver';
        level['number'] = 2;
      } else if (thisyear > 119 && thisyear < 240) {
        level['name'] = 'Gold';
        level['number'] = 3;
      } else if (thisyear > 239) {
        level['name'] = 'Platinum';
        level['number'] = 4;
      }

      return level;
    } // end getLevel

  };
  window.MinnPostMembership = new MinnPostMembership(window.minnpost_membership_data, window.minnpost_membership_settings);
})(window);
"use strict";

// plugin
;

(function ($, window, document, MinnPostMembership) {
  // Create the defaults once
  var pluginName = 'minnpostAmountSelect',
      defaults = {
    frequencySelector: '.m-frequency-select input[type="radio"]',
    amountGroup: '.m-frequency-group',
    amountSelector: '.m-amount-select input[type="radio"]',
    amountLabels: '.m-amount-select label',
    amountValue: 'strong',
    amountDescription: '.a-amount-description',
    amountField: '.a-amount-field #amount',
    levelViewer: '.a-show-level',
    levelName: '.a-level',
    userCurrentLevel: '.a-current-level',
    declineBenefits: '.m-decline-benefits-select input[type="radio"]',
    giftSelectionGroup: '.m-membership-gift-selector',
    swagSelector: '.m-select-swag input[type="radio"]',
    swagLabels: '.m-select-swag input[type="radio"] + label',
    subscriptionsSelector: '.m-select-subscription input[type="checkbox"]',
    subscriptionsLabels: '.m-select-subscription input[type="checkbox"] + label',
    tooltipTextAmountInLabel: '.tooltip-text .min-amount',
    declineSubscriptions: '#subscription-decline'
  }; // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function init() {
      var $frequency = $(this.element).find(this.options.frequencySelector);
      var $suggestedAmount = $(this.options.amountSelector);
      var $amount = $(this.element).find(this.options.amountField);
      var $declineBenefits = $(this.element).find(this.options.declineBenefits);
      var $subscriptions = $(this.element).find(this.options.subscriptionsSelector);

      if (!($amount.length > 0 && $frequency.length > 0 && $suggestedAmount.length > 0)) {
        return;
      } // setup Analytics Enhanced Ecommerce plugin


      if (typeof ga !== 'undefined') {
        ga('require', 'ec');
      } // Set up the UI for the current field state on (re-)load


      this.setAmountLabels($frequency.filter(':checked').val());
      this.checkAndSetLevel();
      $frequency.on('change', this.onFrequencyChange.bind(this));
      $suggestedAmount.on('change', this.onSuggestedAmountChange.bind(this));
      $amount.on('keyup mouseup', this.onAmountChange.bind(this));

      if (!($declineBenefits.length > 0 && $subscriptions.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      if ($subscriptions.not(this.options.declineSubscriptions).is(':checked')) {
        $(this.element).find(this.options.declineSubscriptions).prop('checked', false);
      }

      this.onDeclineBenefitsChange();
      $declineBenefits.on('change', this.onDeclineBenefitsChange.bind(this));
      $subscriptions.on('click', this.onSubscriptionsClick.bind(this));
    },
    // end init
    // step is the integer for the step in the ecommerce process.
    // for this purpose, it's probably always 1.
    // things we need to know: the level name, the amount, and the frequency
    // example:

    /*
    Running command: ga("ec:addProduct", {id: "minnpost_silver_membership", name: "MinnPost Silver Membership", category: "Donation", brand: "MinnPost", variant: "Monthly", price: "5", quantity: 1})
    */
    analyticsTracker: function analyticsTracker(level, amount, frequency_label) {
      if (typeof ga !== 'undefined') {
        ga('ec:addProduct', {
          'id': 'minnpost_' + level.toLowerCase() + '_membership',
          'name': 'MinnPost ' + level.charAt(0).toUpperCase() + level.slice(1) + ' Membership',
          'category': 'Donation',
          'brand': 'MinnPost',
          'variant': frequency_label,
          'price': amount,
          'quantity': 1
        });
      } else {
        return;
      }
    },
    // end analyticsTracker
    onFrequencyChange: function onFrequencyChange(event) {
      this.setAmountLabels($(event.target).val());
      this.setTooltipAmounts($(event.target).val());
      this.checkAndSetLevel();
    },
    // end onFrequencyChange
    onSuggestedAmountChange: function onSuggestedAmountChange(event) {
      $(this.element).find(this.options.amountField).val(null);
      this.checkAndSetLevel();
    },
    // end onSuggestedAmountChange
    onAmountChange: function onAmountChange(event) {
      this.clearAmountSelector(event);
      var $target = $(event.target);

      if ($target.data('last-value') != $target.val()) {
        $target.data('last-value', $target.val());
        this.checkAndSetLevel();
      }
    },
    // end onAmountChange
    onDeclineBenefitsChange: function onDeclineBenefitsChange(event) {
      var $giftSelectionGroup = $(this.element).find(this.options.giftSelectionGroup);
      var decline = $(this.element).find(this.options.declineBenefits).filter(':checked').val();

      if (decline === 'true') {
        $giftSelectionGroup.hide();
        return;
      }

      $giftSelectionGroup.show();
    },
    // end onDeclineBenefitsChange
    onSubscriptionsClick: function onSubscriptionsClick(event) {
      var $subscriptions = $(this.element).find(this.options.subscriptionsSelector).not(this.options.declineSubscriptions);
      var $decline = $(this.element).find(this.options.declineSubscriptions);

      if ($(event.target).is(this.options.declineSubscriptions)) {
        $subscriptions.prop('checked', false);
        return;
      }

      $decline.prop('checked', false);
    },
    // end onSubscriptionsChange
    clearAmountSelector: function clearAmountSelector(event) {
      var $suggestedAmount = $(this.options.amountSelector);

      if ($(event.target).val() === '') {
        return;
      }

      $suggestedAmount.prop('checked', false);
    },
    // end clearAmountSelector
    setAmountLabels: function setAmountLabels(frequencyString) {
      var $groups = $(this.options.amountGroup);
      var $selected = $(this.options.amountSelector).filter(':checked');
      var index = $selected.data('index');
      $groups.removeClass('active');
      $groups.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
      $selected.prop('checked', false);
      $groups.filter('.active').find('input[type="radio"][data-index="' + index + '"]').prop('checked', true);
    },
    // end setAmountLabels
    setTooltipAmounts: function setTooltipAmounts(frequencyString) {
      var that = this;

      var setActiveAmounts = function setActiveAmounts() {
        var $elements = $(this).find(that.options.tooltipTextAmountInLabel);
        $elements.removeClass('active');
        $elements.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
      };

      $(this.options.swagLabels).each(setActiveAmounts);
      $(this.options.subscriptionsLabels).each(setActiveAmounts);
    },
    // end setTooltipAmounts
    checkAndSetLevel: function checkAndSetLevel() {
      var amount = $(this.options.amountSelector).filter(':checked').val();

      if (typeof amount === 'undefined') {
        amount = $(this.options.amountField).val();
      }

      var frequency_string = $(this.options.frequencySelector + ':checked').val();
      var frequency = frequency_string.split(' - ')[1];
      var frequency_name = frequency_string.split(' - ')[0];
      var frequency_id = $(this.options.frequencySelector + ':checked').prop('id');
      var frequency_label = $('label[for="' + frequency_id + '"]').text();
      var level = MinnPostMembership.checkLevel(amount, frequency, frequency_name);
      this.showNewLevel(this.element, this.options, level);
      this.setEnabledGifts(level);
      this.analyticsTracker(level['name'], amount, frequency_label);
    },
    // end checkAndSetLevel
    showNewLevel: function showNewLevel(element, options, level) {
      var member_level_prefix = '';
      var old_level = '';
      var levelViewerContainer = options.levelViewer; // this should change when we replace the text, if there is a link inside it

      var decodeHtmlEntity = function decodeHtmlEntity(str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
          return String.fromCharCode(dec);
        });
      };

      if (typeof minnpost_membership_data !== 'undefined') {
        member_level_prefix = minnpost_membership_data.member_level_prefix;
      }

      if ($(options.levelViewer).length > 0) {
        $(options.levelViewer).prop('class', 'a-show-level a-show-level-' + level['name'].toLowerCase());

        if ($(options.userCurrentLevel).length > 0 && minnpost_membership_data.current_user.member_level.length > 0) {
          if ('a', $(options.levelViewer).length > 0) {
            levelViewerContainer = options.levelViewer + ' a';
          }

          old_level = minnpost_membership_data.current_user.member_level.replace(member_level_prefix, '');

          if (old_level !== level['name'].toLowerCase()) {
            $(levelViewerContainer).html(decodeHtmlEntity($(options.levelViewer).data('changed')));
          } else {
            $(levelViewerContainer).html(decodeHtmlEntity($(options.levelViewer).data('not-changed')));
          }
        }

        $(options.levelName, options.levelViewer).text(level['name']);
      }
    },
    // end showNewLevel
    setEnabledGifts: function setEnabledGifts(level) {
      var setEnabled = function setEnabled() {
        $(this).prop('disabled', level.yearlyAmount < $(this).data('minYearlyAmount'));
      };

      $(this.options.swagSelector).each(setEnabled);
      $(this.options.subscriptionsSelector).each(setEnabled);
    } // end setEnabledGifts

  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document, MinnPostMembership);
"use strict";

(function ($) {
  function benefitForm() {
    if (2 === performance.navigation.type) {
      location.reload(true);
    }

    $('.a-benefit-button.a-button-disabled').removeAttr('disabled');
    $('.a-benefit-button').click(function (event) {
      event.preventDefault();
      var $button = $(this);
      var $status = $('.m-benefit-message', $(this).parent());
      var $select = $('select', $(this).parent());
      var settings = minnpost_membership_settings; // reset the message for current status

      if (!'.m-benefit-message-success') {
        $('.m-benefit-message').removeClass('m-benefit-message-visible m-benefit-message-error m-benefit-message-info');
      } // set button to processing


      $button.text('Processing').addClass('a-button-disabled'); // disable all the other buttons

      $('.a-benefit-button').addClass('a-button-disabled'); // set ajax data

      var data = {};
      var benefitType = $('input[name="benefit-name"]').val();

      if ('partner-offers' === benefitType) {
        data = {
          'action': 'benefit_form_submit',
          'minnpost_membership_benefit_form_nonce': $button.data('benefit-nonce'),
          'current_url': $('input[name="current_url"]').val(),
          'benefit-name': $('input[name="benefit-name"]').val(),
          'instance_id': $('[name="instance-id-' + $button.val() + '"]').val(),
          'post_id': $button.val(),
          'is_ajax': '1'
        };
        $.post(settings.ajaxurl, data, function (response) {
          // success
          if (true === response.success) {
            //console.dir(response);
            $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);

            if (0 < $select.length) {
              $select.prop('disabled', true);
            }

            $('.a-benefit-button').not($button).val(response.data.button_value).attr('disabled', true);
          } else {
            // error
            //console.dir(response);
            if ('undefined' === typeof response.data.remove_instance_value) {
              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } else {
              $('option', $select).each(function (i) {
                if ($(this).val() === response.data.remove_instance_value) {
                  $(this).remove();
                }
              });

              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } // re-enable all the other buttons


            $('.a-benefit-button').not($button).removeClass('a-button-disabled');
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
          }
        });
      }
    });
  }

  $(document).ready(function () {
    if (0 < $('.m-form-membership-benefit').length) {
      benefitForm();
    }
  });
  $('.a-refresh-page').click(function (event) {
    event.preventDefault();
    location.reload();
  });
})(jQuery);
"use strict";

(function ($) {
  function mp_membership_analytics_tracking_event(type, category, action, label, value) {
    if (typeof ga !== 'undefined') {
      if (typeof value === 'undefined') {
        ga('send', type, category, action, label);
      } else {
        ga('send', type, category, action, label, value);
      }
    } else {
      return;
    }
  }

  $(document).ready(function () {
    $('.m-support-cta-top .a-support-button').click(function (event) {
      var value = '';

      if ($('svg', $(this)).length > 0) {
        value = $('svg', $(this)).attr('title') + ' ';
      }

      value = value + $(this).text();
      mp_membership_analytics_tracking_event('event', 'Support CTA - Header', 'Click: ' + value, location.pathname);
    });
  });
})(jQuery);
"use strict";

// plugin
;

(function ($, window, document, MinnPostMembership, undefined) {
  // Create the defaults once
  var pluginName = 'minnpostMembership',
      defaults = {
    'debug': false,
    // this can be set to true on page level options
    'amount_viewer': '.amount h3',
    'frequency_selector_in_levels': '.a-form-item-membership-frequency',
    'frequency_selector_in_levels_type': 'select',
    'levels_container': '.o-membership-member-levels',
    'single_level_container': '.m-membership-member-level',
    'single_level_summary_selector': '.m-member-level-brief',
    'flipped_items': 'div.amount, div.enter',
    'level_frequency_text_selector': '.show-frequency',
    'choose_amount_selector_in_levels': '.amount .a-button-flip',
    'amount_selector_in_levels': '.enter input.amount-entry'
  }; // end defaults
  // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function init(reset, amount) {
      // Place initialization logic here
      // You already have access to the DOM element and
      // the options via the instance, e.g. this.element
      // and this.options
      // you can add more functions like the one below and
      // call them like so: this.yourOtherFunction(this.element, this.options).
      this.catchHashLinks(this.element, this.options);
      this.levelFlipper(this.element, this.options);
      this.startLevelClick(this.element, this.options);
    },
    catchHashLinks: function catchHashLinks(element, options) {
      $('a[href*="#"]:not([href="#"])', element).click(function (e) {
        var target = $(e.target);

        if (target.parent('.comment-title').length == 0 && location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
          var target = $(this.hash);
          target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');

          if (target.length) {
            $('html,body').animate({
              scrollTop: target.offset().top
            }, 1000);
            return false;
          }
        }
      });
    },
    // end catchLinks
    levelFlipper: function levelFlipper(element, options) {
      var that = this;
      var amount = 0;
      var level = '';
      var level_number = 0;
      var frequency_string = '';
      var frequency = '';
      var frequency_name = '';

      if ($(options.levels_container).length > 0) {
        $(options.single_level_summary_selector, element).each(function () {
          $(options.flipped_items, $(this)).wrapAll('<div class="flipper"/>');
        });
        $(options.frequency_selector_in_levels, element).on('change', function (event) {
          level_number = $(this).data('member-level-number');
          frequency_string = $(this).val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];

          if (typeof level_number !== 'undefined') {
            $(options.single_level_summary_selector, element).removeClass('flipped');
            $(options.single_level_container, element).removeClass('active');
            $(event.target).closest(options.single_level_summary_selector).addClass('flipped');

            if (frequency == 1) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-yearly'));
            } else if (frequency == 12) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-monthly'));
            }

            amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
            level = that.checkLevel(amount, frequency, frequency_name, element, options);
            that.changeFrequency(frequency_string, level['name'], element, options);
          } else if ($(options.level_frequency_text_selector).length > 0) {
            $(options.level_frequency_text_selector, element).text(frequency_name);
            $(options.single_level_container).each(function () {
              level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');

              if (typeof level_number !== 'undefined') {
                amount = $(options.amount_selector_in_levels, $(this)).val();
                level = that.checkLevel(amount, frequency, frequency_name, element, options);
              }
            });
          }

          that.changeAmountPreview(frequency_string, level['name'], element, options);
        });
      }

      if ($(options.choose_amount_selector_in_levels).length > 0) {
        $(options.choose_amount_selector_in_levels, element).click(function (event) {
          level_number = $(options.frequency_selector_in_levels, element).data('member-level-number');
          $(options.single_level_summary_selector, element).removeClass('flipped');
          $(options.single_level_container, element).removeClass('active');
          $(event.target).closest(options.single_level_summary_selector).addClass('flipped');
          frequency_string = $(options.frequency_selector_in_levels, $(this).parent()).val();
          frequency = frequency_string.split(' - ')[1];
          amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
          level = that.checkLevel(amount, frequency, frequency_name, element, options);
          event.preventDefault();
        });
      }
    },
    // end levelFlipper
    checkLevel: function checkLevel(amount, frequency, type, element, options) {
      var level = MinnPostMembership.checkLevel(amount, frequency, type);
      $('h2', options.single_level_summary_selector).each(function () {
        if ($(this).text() == level['name']) {
          $(options.single_level_container, element).removeClass('active');
          $(this).parent().parent().addClass('active');
        }
      });
      return level;
    },
    // end checkLevel
    changeFrequency: function changeFrequency(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        var range = $(options.amount_viewer, $(this)).text();
        var month_value = $(options.amount_viewer, $(this)).data('month');
        var year_value = $(options.amount_viewer, $(this)).data('year');
        var once_value = $(options.amount_viewer, $(this)).data('one-time');
        var frequency_name = selected.split(' - ')[0];
        var frequency = parseInt(selected.split(' - ')[1]);
        $(options.frequency_selector_in_levels).val(selected);
        $(options.frequency_selector_in_levels).prop('selected', selected);

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
        $(options.frequency_selector_in_levels, $(this)).data('frequency', frequency);
      });
    },
    // end changeFrequency
    changeAmountPreview: function changeAmountPreview(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        var range = $(options.amount_viewer, $(this)).text();
        var month_value = $(options.amount_viewer, $(this)).data('month');
        var year_value = $(options.amount_viewer, $(this)).data('year');
        var once_value = $(options.amount_viewer, $(this)).data('one-time');
        var frequency_name = selected.split(' - ')[0];

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
      });
    },
    // end changeAmountPreview
    startLevelClick: function startLevelClick(element, options) {
      $('.start-level').click(function () {
        var level_class = $(this).prop('class');
        var level_number = level_class[level_class.length - 1];
        $(options.single_level_summary_selector, element).removeClass('flipped');
        $(options.single_level_container, element).removeClass('active');
        $(options.single_level_container + '-' + level_number, element).addClass('active');
        $(options.single_level_container + '-' + level_number + ' ' + options.single_level_summary_selector).addClass('flipped');
      });
    } // end startLevelClick

  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document, MinnPostMembership);
"use strict";

// plugin
;

(function ($, window, document) {
  // Create the defaults once
  var pluginName = 'minnpostTrackSubmit',
      defaults = {
    type: 'event',
    category: 'Support Us',
    action: 'Become A Member',
    label: location.pathname
  }; // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function init() {
      var that = this;
      var options = this.options;
      $(this.element).submit(function (event) {
        // this tracks an event submission based on the plugin options
        // it also bubbles the event up to submit the form
        that.analyticsEventTrack(options.type, options.category, options.action, options.label); // if this is the main checkout form, send it to the ec plugin as a checkout

        that.analyticsEcommerceTrack($(that.element));
      });
    },
    analyticsEventTrack: function analyticsEventTrack(type, category, action, label, value) {
      if (typeof ga === 'undefined') {
        return;
      }

      if (typeof value === 'undefined') {
        ga('send', type, category, action, label);
        return;
      }

      ga('send', type, category, action, label, value);
    },
    // end analyticsEventTrack
    analyticsEcommerceTrack: function analyticsEcommerceTrack(element) {
      if (typeof ga === 'undefined') {
        return;
      }

      ga('require', 'ec');

      if (element.hasClass('m-form-membership-support')) {
        ga('ec:setAction', 'checkout', {
          'step': 1
        });
      }
    } // end analyticsEcommerceTrack

  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIiwidHJhY2stc3VibWl0LmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0aW9uR3JvdXAiLCJzd2FnU2VsZWN0b3IiLCJzd2FnTGFiZWxzIiwic3Vic2NyaXB0aW9uc1NlbGVjdG9yIiwic3Vic2NyaXB0aW9uc0xhYmVscyIsInRvb2x0aXBUZXh0QW1vdW50SW5MYWJlbCIsImRlY2xpbmVTdWJzY3JpcHRpb25zIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCIkZnJlcXVlbmN5IiwiZmluZCIsIiRzdWdnZXN0ZWRBbW91bnQiLCIkYW1vdW50IiwiJGRlY2xpbmVCZW5lZml0cyIsIiRzdWJzY3JpcHRpb25zIiwibGVuZ3RoIiwiZ2EiLCJzZXRBbW91bnRMYWJlbHMiLCJmaWx0ZXIiLCJ2YWwiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJvblN1YnNjcmlwdGlvbnNDbGljayIsImFuYWx5dGljc1RyYWNrZXIiLCJmcmVxdWVuY3lfbGFiZWwiLCJ0b0xvd2VyQ2FzZSIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJldmVudCIsInRhcmdldCIsInNldFRvb2x0aXBBbW91bnRzIiwiY2xlYXJBbW91bnRTZWxlY3RvciIsIiR0YXJnZXQiLCIkZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZGVjbGluZSIsImhpZGUiLCJzaG93IiwiJGRlY2xpbmUiLCJmcmVxdWVuY3lTdHJpbmciLCIkZ3JvdXBzIiwiJHNlbGVjdGVkIiwiaW5kZXgiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwidGhhdCIsInNldEFjdGl2ZUFtb3VudHMiLCIkZWxlbWVudHMiLCJlYWNoIiwiZnJlcXVlbmN5X3N0cmluZyIsInNwbGl0IiwiZnJlcXVlbmN5X25hbWUiLCJmcmVxdWVuY3lfaWQiLCJ0ZXh0Iiwic2hvd05ld0xldmVsIiwic2V0RW5hYmxlZEdpZnRzIiwibWVtYmVyX2xldmVsX3ByZWZpeCIsIm9sZF9sZXZlbCIsImxldmVsVmlld2VyQ29udGFpbmVyIiwiZGVjb2RlSHRtbEVudGl0eSIsInN0ciIsInJlcGxhY2UiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsIm1lbWJlcl9sZXZlbCIsImh0bWwiLCJzZXRFbmFibGVkIiwieWVhcmx5QW1vdW50IiwiZm4iLCJqUXVlcnkiLCJiZW5lZml0Rm9ybSIsInBlcmZvcm1hbmNlIiwibmF2aWdhdGlvbiIsImxvY2F0aW9uIiwicmVsb2FkIiwicmVtb3ZlQXR0ciIsImNsaWNrIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwiJHN0YXR1cyIsInBhcmVudCIsIiRzZWxlY3QiLCJiZW5lZml0VHlwZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwiYnV0dG9uX2F0dHIiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCIsImNhdGVnb3J5IiwiYWN0aW9uIiwibGFiZWwiLCJ2YWx1ZSIsInBhdGhuYW1lIiwidW5kZWZpbmVkIiwicmVzZXQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsImUiLCJob3N0bmFtZSIsImhhc2giLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwibGV2ZWxfbnVtYmVyIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsInN1Ym1pdCIsImFuYWx5dGljc0V2ZW50VHJhY2siLCJhbmFseXRpY3NFY29tbWVyY2VUcmFjayIsImhhc0NsYXNzIl0sIm1hcHBpbmdzIjoiOztBQUFBOztBQUFDLENBQUMsVUFBV0EsTUFBWCxFQUFvQjtBQUNyQixXQUFTQyxrQkFBVCxDQUE2QkMsSUFBN0IsRUFBbUNDLFFBQW5DLEVBQThDO0FBQzdDLFNBQUtELElBQUwsR0FBWSxFQUFaOztBQUNBLFFBQUksT0FBT0EsSUFBUCxLQUFnQixXQUFwQixFQUFpQztBQUNoQyxXQUFLQSxJQUFMLEdBQVlBLElBQVo7QUFDQTs7QUFFRCxTQUFLQyxRQUFMLEdBQWdCLEVBQWhCOztBQUNBLFFBQUksT0FBT0EsUUFBUCxLQUFvQixXQUF4QixFQUFxQztBQUNwQyxXQUFLQSxRQUFMLEdBQWdCQSxRQUFoQjtBQUNBOztBQUVELFNBQUtDLGNBQUwsR0FBc0IsRUFBdEI7O0FBQ0EsUUFBSyxPQUFPLEtBQUtGLElBQUwsQ0FBVUcsWUFBakIsS0FBa0MsV0FBbEMsSUFDQSxPQUFPLEtBQUtILElBQUwsQ0FBVUcsWUFBVixDQUF1QkMsZUFBOUIsS0FBa0QsV0FEdkQsRUFDcUU7QUFDcEUsV0FBS0YsY0FBTCxHQUFzQixLQUFLRixJQUFMLENBQVVHLFlBQVYsQ0FBdUJDLGVBQTdDO0FBQ0E7QUFDRDs7QUFFREwsRUFBQUEsa0JBQWtCLENBQUNNLFNBQW5CLEdBQStCO0FBQzlCQyxJQUFBQSxVQUFVLEVBQUUsb0JBQVVDLE1BQVYsRUFBa0JDLFNBQWxCLEVBQTZCQyxJQUE3QixFQUFvQztBQUMvQyxVQUFJQyxRQUFRLEdBQUdDLFFBQVEsQ0FBRUosTUFBRixDQUFSLEdBQXFCSSxRQUFRLENBQUVILFNBQUYsQ0FBNUM7O0FBQ0EsVUFBSyxPQUFPLEtBQUtOLGNBQVosS0FBK0IsV0FBL0IsSUFBOEMsS0FBS0EsY0FBTCxLQUF3QixFQUEzRSxFQUFnRjtBQUMvRSxZQUFJVSxpQkFBaUIsR0FBR0QsUUFBUSxDQUFFLEtBQUtULGNBQUwsQ0FBb0JXLHdCQUF0QixFQUFnRCxFQUFoRCxDQUFoQztBQUNBLFlBQUlDLGtCQUFrQixHQUFHSCxRQUFRLENBQUUsS0FBS1QsY0FBTCxDQUFvQmEseUJBQXRCLEVBQWlELEVBQWpELENBQWpDO0FBQ0EsWUFBSUMsdUJBQXVCLEdBQUdMLFFBQVEsQ0FBRSxLQUFLVCxjQUFMLENBQW9CYyx1QkFBdEIsRUFBK0MsRUFBL0MsQ0FBdEMsQ0FIK0UsQ0FJL0U7O0FBQ0EsWUFBS1AsSUFBSSxLQUFLLFVBQWQsRUFBMkI7QUFDMUJHLFVBQUFBLGlCQUFpQixJQUFJRixRQUFyQjtBQUNBLFNBRkQsTUFFTztBQUNOTSxVQUFBQSx1QkFBdUIsSUFBSU4sUUFBM0I7QUFDQTs7QUFFREEsUUFBQUEsUUFBUSxHQUFHTyxJQUFJLENBQUNDLEdBQUwsQ0FBVU4saUJBQVYsRUFBNkJFLGtCQUE3QixFQUFpREUsdUJBQWpELENBQVg7QUFDQTs7QUFFRCxhQUFPLEtBQUtHLFFBQUwsQ0FBZVQsUUFBZixDQUFQO0FBQ0EsS0FsQjZCO0FBa0IzQjtBQUVIUyxJQUFBQSxRQUFRLEVBQUUsa0JBQVVULFFBQVYsRUFBcUI7QUFDOUIsVUFBSVUsS0FBSyxHQUFHO0FBQ1gsd0JBQWdCVjtBQURMLE9BQVo7O0FBR0EsVUFBS0EsUUFBUSxHQUFHLENBQVgsSUFBZ0JBLFFBQVEsR0FBRyxFQUFoQyxFQUFxQztBQUNwQ1UsUUFBQUEsS0FBSyxDQUFDLE1BQUQsQ0FBTCxHQUFnQixRQUFoQjtBQUNBQSxRQUFBQSxLQUFLLENBQUMsUUFBRCxDQUFMLEdBQWtCLENBQWxCO0FBQ0EsT0FIRCxNQUlLLElBQUlWLFFBQVEsR0FBRyxFQUFYLElBQWlCQSxRQUFRLEdBQUcsR0FBaEMsRUFBcUM7QUFDekNVLFFBQUFBLEtBQUssQ0FBQyxNQUFELENBQUwsR0FBZ0IsUUFBaEI7QUFDQUEsUUFBQUEsS0FBSyxDQUFDLFFBQUQsQ0FBTCxHQUFrQixDQUFsQjtBQUNBLE9BSEksTUFHRSxJQUFJVixRQUFRLEdBQUcsR0FBWCxJQUFrQkEsUUFBUSxHQUFHLEdBQWpDLEVBQXNDO0FBQzVDVSxRQUFBQSxLQUFLLENBQUMsTUFBRCxDQUFMLEdBQWdCLE1BQWhCO0FBQ0FBLFFBQUFBLEtBQUssQ0FBQyxRQUFELENBQUwsR0FBa0IsQ0FBbEI7QUFDQSxPQUhNLE1BR0EsSUFBSVYsUUFBUSxHQUFHLEdBQWYsRUFBb0I7QUFDMUJVLFFBQUFBLEtBQUssQ0FBQyxNQUFELENBQUwsR0FBZ0IsVUFBaEI7QUFDQUEsUUFBQUEsS0FBSyxDQUFDLFFBQUQsQ0FBTCxHQUFrQixDQUFsQjtBQUNBOztBQUNELGFBQU9BLEtBQVA7QUFDQSxLQXZDNkIsQ0F1QzNCOztBQXZDMkIsR0FBL0I7QUEwQ0F0QixFQUFBQSxNQUFNLENBQUNDLGtCQUFQLEdBQTRCLElBQUlBLGtCQUFKLENBQzNCRCxNQUFNLENBQUN1Qix3QkFEb0IsRUFFM0J2QixNQUFNLENBQUN3Qiw0QkFGb0IsQ0FBNUI7QUFJQSxDQWpFQSxFQWlFR3hCLE1BakVIOzs7QUNBRDtBQUNBOztBQUFDLENBQUMsVUFBV3lCLENBQVgsRUFBY3pCLE1BQWQsRUFBc0IwQixRQUF0QixFQUFnQ3pCLGtCQUFoQyxFQUFxRDtBQUN0RDtBQUNBLE1BQUkwQixVQUFVLEdBQUcsc0JBQWpCO0FBQUEsTUFDQUMsUUFBUSxHQUFHO0FBQ1ZDLElBQUFBLGlCQUFpQixFQUFFLHlDQURUO0FBRVZDLElBQUFBLFdBQVcsRUFBRSxvQkFGSDtBQUdWQyxJQUFBQSxjQUFjLEVBQUUsc0NBSE47QUFJVkMsSUFBQUEsWUFBWSxFQUFFLHdCQUpKO0FBS1ZDLElBQUFBLFdBQVcsRUFBRSxRQUxIO0FBTVZDLElBQUFBLGlCQUFpQixFQUFFLHVCQU5UO0FBT1ZDLElBQUFBLFdBQVcsRUFBRSx5QkFQSDtBQVFWQyxJQUFBQSxXQUFXLEVBQUUsZUFSSDtBQVNWQyxJQUFBQSxTQUFTLEVBQUUsVUFURDtBQVVWQyxJQUFBQSxnQkFBZ0IsRUFBRSxrQkFWUjtBQVdWQyxJQUFBQSxlQUFlLEVBQUUsZ0RBWFA7QUFZVkMsSUFBQUEsa0JBQWtCLEVBQUUsNkJBWlY7QUFhVkMsSUFBQUEsWUFBWSxFQUFFLG9DQWJKO0FBY1ZDLElBQUFBLFVBQVUsRUFBRSw0Q0FkRjtBQWVWQyxJQUFBQSxxQkFBcUIsRUFBRSwrQ0FmYjtBQWdCVkMsSUFBQUEsbUJBQW1CLEVBQUUsdURBaEJYO0FBaUJWQyxJQUFBQSx3QkFBd0IsRUFBRSwyQkFqQmhCO0FBa0JWQyxJQUFBQSxvQkFBb0IsRUFBRTtBQWxCWixHQURYLENBRnNELENBd0J0RDs7QUFDQSxXQUFTQyxNQUFULENBQWlCQyxPQUFqQixFQUEwQkMsT0FBMUIsRUFBb0M7QUFDbkMsU0FBS0QsT0FBTCxHQUFlQSxPQUFmLENBRG1DLENBR25DO0FBQ0E7QUFDQTtBQUNBOztBQUNBLFNBQUtDLE9BQUwsR0FBZXhCLENBQUMsQ0FBQ3lCLE1BQUYsQ0FBVSxFQUFWLEVBQWN0QixRQUFkLEVBQXdCcUIsT0FBeEIsQ0FBZjtBQUVBLFNBQUtFLFNBQUwsR0FBaUJ2QixRQUFqQjtBQUNBLFNBQUt3QixLQUFMLEdBQWF6QixVQUFiO0FBRUEsU0FBSzBCLElBQUw7QUFDQSxHQXRDcUQsQ0FzQ3BEOzs7QUFFRk4sRUFBQUEsTUFBTSxDQUFDeEMsU0FBUCxHQUFtQjtBQUNsQjhDLElBQUFBLElBQUksRUFBRSxnQkFBVztBQUNoQixVQUFJQyxVQUFVLEdBQUc3QixDQUFDLENBQUUsS0FBS3VCLE9BQVAsQ0FBRCxDQUFrQk8sSUFBbEIsQ0FBd0IsS0FBS04sT0FBTCxDQUFhcEIsaUJBQXJDLENBQWpCO0FBQ0EsVUFBSTJCLGdCQUFnQixHQUFHL0IsQ0FBQyxDQUFFLEtBQUt3QixPQUFMLENBQWFsQixjQUFmLENBQXhCO0FBQ0EsVUFBSTBCLE9BQU8sR0FBR2hDLENBQUMsQ0FBRSxLQUFLdUIsT0FBUCxDQUFELENBQWtCTyxJQUFsQixDQUF3QixLQUFLTixPQUFMLENBQWFkLFdBQXJDLENBQWQ7QUFDQSxVQUFJdUIsZ0JBQWdCLEdBQUdqQyxDQUFDLENBQUUsS0FBS3VCLE9BQVAsQ0FBRCxDQUFrQk8sSUFBbEIsQ0FBd0IsS0FBS04sT0FBTCxDQUFhVixlQUFyQyxDQUF2QjtBQUNBLFVBQUlvQixjQUFjLEdBQUdsQyxDQUFDLENBQUUsS0FBS3VCLE9BQVAsQ0FBRCxDQUFrQk8sSUFBbEIsQ0FBd0IsS0FBS04sT0FBTCxDQUFhTixxQkFBckMsQ0FBckI7O0FBQ0EsVUFBSyxFQUFHYyxPQUFPLENBQUNHLE1BQVIsR0FBaUIsQ0FBakIsSUFDQU4sVUFBVSxDQUFDTSxNQUFYLEdBQW9CLENBRHBCLElBRUFKLGdCQUFnQixDQUFDSSxNQUFqQixHQUEwQixDQUY3QixDQUFMLEVBRXdDO0FBQ3ZDO0FBQ0EsT0FWZSxDQVloQjs7O0FBQ0EsVUFBSyxPQUFPQyxFQUFQLEtBQWMsV0FBbkIsRUFBaUM7QUFDaENBLFFBQUFBLEVBQUUsQ0FBRSxTQUFGLEVBQWEsSUFBYixDQUFGO0FBQ0EsT0FmZSxDQWlCaEI7OztBQUNBLFdBQUtDLGVBQUwsQ0FBc0JSLFVBQVUsQ0FBQ1MsTUFBWCxDQUFrQixVQUFsQixFQUE4QkMsR0FBOUIsRUFBdEI7QUFDQSxXQUFLQyxnQkFBTDtBQUVBWCxNQUFBQSxVQUFVLENBQUNZLEVBQVgsQ0FBZSxRQUFmLEVBQXlCLEtBQUtDLGlCQUFMLENBQXVCQyxJQUF2QixDQUE0QixJQUE1QixDQUF6QjtBQUNBWixNQUFBQSxnQkFBZ0IsQ0FBQ1UsRUFBakIsQ0FBcUIsUUFBckIsRUFBK0IsS0FBS0csdUJBQUwsQ0FBNkJELElBQTdCLENBQWtDLElBQWxDLENBQS9CO0FBQ0FYLE1BQUFBLE9BQU8sQ0FBQ1MsRUFBUixDQUFZLGVBQVosRUFBNkIsS0FBS0ksY0FBTCxDQUFvQkYsSUFBcEIsQ0FBeUIsSUFBekIsQ0FBN0I7O0FBRUEsVUFBSyxFQUFJVixnQkFBZ0IsQ0FBQ0UsTUFBakIsR0FBMEIsQ0FBMUIsSUFBK0JELGNBQWMsQ0FBQ0MsTUFBZixHQUF3QixDQUEzRCxDQUFMLEVBQXNFO0FBQ3JFO0FBQ0EsT0EzQmUsQ0E2QmhCOzs7QUFDQSxVQUFLRCxjQUFjLENBQUNZLEdBQWYsQ0FBb0IsS0FBS3RCLE9BQUwsQ0FBYUgsb0JBQWpDLEVBQXdEMEIsRUFBeEQsQ0FBNEQsVUFBNUQsQ0FBTCxFQUFnRjtBQUMvRS9DLFFBQUFBLENBQUMsQ0FBRSxLQUFLdUIsT0FBUCxDQUFELENBQWtCTyxJQUFsQixDQUF3QixLQUFLTixPQUFMLENBQWFILG9CQUFyQyxFQUE0RDJCLElBQTVELENBQWtFLFNBQWxFLEVBQTZFLEtBQTdFO0FBQ0E7O0FBQ0QsV0FBS0MsdUJBQUw7QUFFQWhCLE1BQUFBLGdCQUFnQixDQUFDUSxFQUFqQixDQUFxQixRQUFyQixFQUErQixLQUFLUSx1QkFBTCxDQUE2Qk4sSUFBN0IsQ0FBbUMsSUFBbkMsQ0FBL0I7QUFDQVQsTUFBQUEsY0FBYyxDQUFDTyxFQUFmLENBQW1CLE9BQW5CLEVBQTRCLEtBQUtTLG9CQUFMLENBQTBCUCxJQUExQixDQUFnQyxJQUFoQyxDQUE1QjtBQUNBLEtBdENpQjtBQXNDZjtBQUVGO0FBQ0E7QUFDQTtBQUNBOztBQUNBOzs7QUFHRFEsSUFBQUEsZ0JBQWdCLEVBQUUsMEJBQVV0RCxLQUFWLEVBQWlCYixNQUFqQixFQUF5Qm9FLGVBQXpCLEVBQTJDO0FBQzVELFVBQUssT0FBT2hCLEVBQVAsS0FBYyxXQUFuQixFQUFpQztBQUNoQ0EsUUFBQUEsRUFBRSxDQUFFLGVBQUYsRUFBbUI7QUFDcEIsZ0JBQU0sY0FBY3ZDLEtBQUssQ0FBQ3dELFdBQU4sRUFBZCxHQUFvQyxhQUR0QjtBQUVwQixrQkFBUSxjQUFjeEQsS0FBSyxDQUFDeUQsTUFBTixDQUFhLENBQWIsRUFBZ0JDLFdBQWhCLEVBQWQsR0FBOEMxRCxLQUFLLENBQUMyRCxLQUFOLENBQVksQ0FBWixDQUE5QyxHQUErRCxhQUZuRDtBQUdwQixzQkFBWSxVQUhRO0FBSXBCLG1CQUFTLFVBSlc7QUFLcEIscUJBQVlKLGVBTFE7QUFNcEIsbUJBQVNwRSxNQU5XO0FBT3BCLHNCQUFZO0FBUFEsU0FBbkIsQ0FBRjtBQVNBLE9BVkQsTUFVTztBQUNOO0FBQ0E7QUFDRCxLQTdEaUI7QUE2RGY7QUFFSDBELElBQUFBLGlCQUFpQixFQUFFLDJCQUFVZSxLQUFWLEVBQWtCO0FBQ3BDLFdBQUtwQixlQUFMLENBQXNCckMsQ0FBQyxDQUFFeUQsS0FBSyxDQUFDQyxNQUFSLENBQUQsQ0FBa0JuQixHQUFsQixFQUF0QjtBQUNBLFdBQUtvQixpQkFBTCxDQUF3QjNELENBQUMsQ0FBRXlELEtBQUssQ0FBQ0MsTUFBUixDQUFELENBQWtCbkIsR0FBbEIsRUFBeEI7QUFDQSxXQUFLQyxnQkFBTDtBQUNBLEtBbkVpQjtBQW1FZjtBQUVISSxJQUFBQSx1QkFBdUIsRUFBRSxpQ0FBVWEsS0FBVixFQUFrQjtBQUMxQ3pELE1BQUFBLENBQUMsQ0FBRSxLQUFLdUIsT0FBUCxDQUFELENBQWtCTyxJQUFsQixDQUF3QixLQUFLTixPQUFMLENBQWFkLFdBQXJDLEVBQW1ENkIsR0FBbkQsQ0FBd0QsSUFBeEQ7QUFDQSxXQUFLQyxnQkFBTDtBQUNBLEtBeEVpQjtBQXdFZjtBQUVISyxJQUFBQSxjQUFjLEVBQUUsd0JBQVVZLEtBQVYsRUFBa0I7QUFDakMsV0FBS0csbUJBQUwsQ0FBMEJILEtBQTFCO0FBRUEsVUFBSUksT0FBTyxHQUFHN0QsQ0FBQyxDQUFFeUQsS0FBSyxDQUFDQyxNQUFSLENBQWY7O0FBQ0EsVUFBS0csT0FBTyxDQUFDcEYsSUFBUixDQUFjLFlBQWQsS0FBZ0NvRixPQUFPLENBQUN0QixHQUFSLEVBQXJDLEVBQXFEO0FBQ3BEc0IsUUFBQUEsT0FBTyxDQUFDcEYsSUFBUixDQUFjLFlBQWQsRUFBNEJvRixPQUFPLENBQUN0QixHQUFSLEVBQTVCO0FBQ0EsYUFBS0MsZ0JBQUw7QUFDQTtBQUNELEtBbEZpQjtBQWtGZjtBQUVIUyxJQUFBQSx1QkFBdUIsRUFBRSxpQ0FBVVEsS0FBVixFQUFrQjtBQUMxQyxVQUFJSyxtQkFBbUIsR0FBRzlELENBQUMsQ0FBRSxLQUFLdUIsT0FBUCxDQUFELENBQWtCTyxJQUFsQixDQUF3QixLQUFLTixPQUFMLENBQWFULGtCQUFyQyxDQUExQjtBQUNBLFVBQUlnRCxPQUFPLEdBQUcvRCxDQUFDLENBQUUsS0FBS3VCLE9BQVAsQ0FBRCxDQUFrQk8sSUFBbEIsQ0FBd0IsS0FBS04sT0FBTCxDQUFhVixlQUFyQyxFQUF1RHdCLE1BQXZELENBQStELFVBQS9ELEVBQTRFQyxHQUE1RSxFQUFkOztBQUVBLFVBQUt3QixPQUFPLEtBQUssTUFBakIsRUFBMEI7QUFDekJELFFBQUFBLG1CQUFtQixDQUFDRSxJQUFwQjtBQUNBO0FBQ0E7O0FBRURGLE1BQUFBLG1CQUFtQixDQUFDRyxJQUFwQjtBQUNBLEtBOUZpQjtBQThGZjtBQUVIZixJQUFBQSxvQkFBb0IsRUFBRSw4QkFBVU8sS0FBVixFQUFrQjtBQUN2QyxVQUFJdkIsY0FBYyxHQUFHbEMsQ0FBQyxDQUFFLEtBQUt1QixPQUFQLENBQUQsQ0FBa0JPLElBQWxCLENBQXdCLEtBQUtOLE9BQUwsQ0FBYU4scUJBQXJDLEVBQTZENEIsR0FBN0QsQ0FBa0UsS0FBS3RCLE9BQUwsQ0FBYUgsb0JBQS9FLENBQXJCO0FBQ0EsVUFBSTZDLFFBQVEsR0FBR2xFLENBQUMsQ0FBRSxLQUFLdUIsT0FBUCxDQUFELENBQWtCTyxJQUFsQixDQUF3QixLQUFLTixPQUFMLENBQWFILG9CQUFyQyxDQUFmOztBQUVBLFVBQUtyQixDQUFDLENBQUV5RCxLQUFLLENBQUNDLE1BQVIsQ0FBRCxDQUFrQlgsRUFBbEIsQ0FBc0IsS0FBS3ZCLE9BQUwsQ0FBYUgsb0JBQW5DLENBQUwsRUFBaUU7QUFDaEVhLFFBQUFBLGNBQWMsQ0FBQ2MsSUFBZixDQUFxQixTQUFyQixFQUFnQyxLQUFoQztBQUNBO0FBQ0E7O0FBRURrQixNQUFBQSxRQUFRLENBQUNsQixJQUFULENBQWUsU0FBZixFQUEwQixLQUExQjtBQUNBLEtBMUdpQjtBQTBHZjtBQUVIWSxJQUFBQSxtQkFBbUIsRUFBRSw2QkFBVUgsS0FBVixFQUFrQjtBQUN0QyxVQUFJMUIsZ0JBQWdCLEdBQUcvQixDQUFDLENBQUUsS0FBS3dCLE9BQUwsQ0FBYWxCLGNBQWYsQ0FBeEI7O0FBRUEsVUFBS04sQ0FBQyxDQUFFeUQsS0FBSyxDQUFDQyxNQUFSLENBQUQsQ0FBa0JuQixHQUFsQixPQUE0QixFQUFqQyxFQUFzQztBQUNyQztBQUNBOztBQUVEUixNQUFBQSxnQkFBZ0IsQ0FBQ2lCLElBQWpCLENBQXVCLFNBQXZCLEVBQWtDLEtBQWxDO0FBQ0EsS0FwSGlCO0FBb0hmO0FBRUhYLElBQUFBLGVBQWUsRUFBRSx5QkFBVThCLGVBQVYsRUFBNEI7QUFDNUMsVUFBSUMsT0FBTyxHQUFHcEUsQ0FBQyxDQUFFLEtBQUt3QixPQUFMLENBQWFuQixXQUFmLENBQWY7QUFDQSxVQUFJZ0UsU0FBUyxHQUFHckUsQ0FBQyxDQUFFLEtBQUt3QixPQUFMLENBQWFsQixjQUFmLENBQUQsQ0FDWGdDLE1BRFcsQ0FDSCxVQURHLENBQWhCO0FBRUEsVUFBSWdDLEtBQUssR0FBR0QsU0FBUyxDQUFDNUYsSUFBVixDQUFnQixPQUFoQixDQUFaO0FBRUEyRixNQUFBQSxPQUFPLENBQUNHLFdBQVIsQ0FBcUIsUUFBckI7QUFDQUgsTUFBQUEsT0FBTyxDQUFDOUIsTUFBUixDQUFnQixzQkFBc0I2QixlQUF0QixHQUF3QyxJQUF4RCxFQUNFSyxRQURGLENBQ1ksUUFEWjtBQUVBSCxNQUFBQSxTQUFTLENBQUNyQixJQUFWLENBQWdCLFNBQWhCLEVBQTJCLEtBQTNCO0FBQ0FvQixNQUFBQSxPQUFPLENBQUM5QixNQUFSLENBQWdCLFNBQWhCLEVBQ0VSLElBREYsQ0FDUSxxQ0FBcUN3QyxLQUFyQyxHQUE2QyxJQURyRCxFQUVFdEIsSUFGRixDQUVRLFNBRlIsRUFFbUIsSUFGbkI7QUFHQSxLQW5JaUI7QUFtSWY7QUFFSFcsSUFBQUEsaUJBQWlCLEVBQUUsMkJBQVVRLGVBQVYsRUFBNEI7QUFDOUMsVUFBSU0sSUFBSSxHQUFHLElBQVg7O0FBQ0EsVUFBSUMsZ0JBQWdCLEdBQUcsU0FBbkJBLGdCQUFtQixHQUFXO0FBQ2pDLFlBQUlDLFNBQVMsR0FBRzNFLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVThCLElBQVYsQ0FBZ0IyQyxJQUFJLENBQUNqRCxPQUFMLENBQWFKLHdCQUE3QixDQUFoQjtBQUNBdUQsUUFBQUEsU0FBUyxDQUFDSixXQUFWLENBQXVCLFFBQXZCO0FBQ0FJLFFBQUFBLFNBQVMsQ0FBQ3JDLE1BQVYsQ0FBa0Isc0JBQXNCNkIsZUFBdEIsR0FBd0MsSUFBMUQsRUFDRUssUUFERixDQUNZLFFBRFo7QUFFQSxPQUxEOztBQU1BeEUsTUFBQUEsQ0FBQyxDQUFFLEtBQUt3QixPQUFMLENBQWFQLFVBQWYsQ0FBRCxDQUE2QjJELElBQTdCLENBQW1DRixnQkFBbkM7QUFDQTFFLE1BQUFBLENBQUMsQ0FBRSxLQUFLd0IsT0FBTCxDQUFhTCxtQkFBZixDQUFELENBQXNDeUQsSUFBdEMsQ0FBNENGLGdCQUE1QztBQUNBLEtBL0lpQjtBQStJZjtBQUVIbEMsSUFBQUEsZ0JBQWdCLEVBQUUsNEJBQVc7QUFDNUIsVUFBSXhELE1BQU0sR0FBR2dCLENBQUMsQ0FBRSxLQUFLd0IsT0FBTCxDQUFhbEIsY0FBZixDQUFELENBQWlDZ0MsTUFBakMsQ0FBeUMsVUFBekMsRUFBc0RDLEdBQXRELEVBQWI7O0FBQ0EsVUFBSyxPQUFPdkQsTUFBUCxLQUFrQixXQUF2QixFQUFxQztBQUNwQ0EsUUFBQUEsTUFBTSxHQUFHZ0IsQ0FBQyxDQUFFLEtBQUt3QixPQUFMLENBQWFkLFdBQWYsQ0FBRCxDQUE4QjZCLEdBQTlCLEVBQVQ7QUFDQTs7QUFFRCxVQUFJc0MsZ0JBQWdCLEdBQUc3RSxDQUFDLENBQUUsS0FBS3dCLE9BQUwsQ0FBYXBCLGlCQUFiLEdBQWlDLFVBQW5DLENBQUQsQ0FBaURtQyxHQUFqRCxFQUF2QjtBQUNBLFVBQUl0RCxTQUFTLEdBQUc0RixnQkFBZ0IsQ0FBQ0MsS0FBakIsQ0FBdUIsS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBaEI7QUFDQSxVQUFJQyxjQUFjLEdBQUdGLGdCQUFnQixDQUFDQyxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFyQjtBQUNBLFVBQUlFLFlBQVksR0FBR2hGLENBQUMsQ0FBRSxLQUFLd0IsT0FBTCxDQUFhcEIsaUJBQWIsR0FBaUMsVUFBbkMsQ0FBRCxDQUFpRDRDLElBQWpELENBQXVELElBQXZELENBQW5CO0FBQ0EsVUFBSUksZUFBZSxHQUFHcEQsQ0FBQyxDQUFFLGdCQUFnQmdGLFlBQWhCLEdBQStCLElBQWpDLENBQUQsQ0FBeUNDLElBQXpDLEVBQXRCO0FBRUEsVUFBSXBGLEtBQUssR0FBR3JCLGtCQUFrQixDQUFDTyxVQUFuQixDQUErQkMsTUFBL0IsRUFBdUNDLFNBQXZDLEVBQWtEOEYsY0FBbEQsQ0FBWjtBQUNBLFdBQUtHLFlBQUwsQ0FBbUIsS0FBSzNELE9BQXhCLEVBQWlDLEtBQUtDLE9BQXRDLEVBQStDM0IsS0FBL0M7QUFDQSxXQUFLc0YsZUFBTCxDQUFzQnRGLEtBQXRCO0FBQ0EsV0FBS3NELGdCQUFMLENBQXVCdEQsS0FBSyxDQUFDLE1BQUQsQ0FBNUIsRUFBc0NiLE1BQXRDLEVBQThDb0UsZUFBOUM7QUFDQSxLQWpLaUI7QUFpS2Y7QUFFSDhCLElBQUFBLFlBQVksRUFBRSxzQkFBVTNELE9BQVYsRUFBbUJDLE9BQW5CLEVBQTRCM0IsS0FBNUIsRUFBb0M7QUFDakQsVUFBSXVGLG1CQUFtQixHQUFHLEVBQTFCO0FBQ0EsVUFBSUMsU0FBUyxHQUFHLEVBQWhCO0FBQ0EsVUFBSUMsb0JBQW9CLEdBQUc5RCxPQUFPLENBQUNiLFdBQW5DLENBSGlELENBR0Q7O0FBQ2hELFVBQUk0RSxnQkFBZ0IsR0FBRyxTQUFuQkEsZ0JBQW1CLENBQVVDLEdBQVYsRUFBZ0I7QUFDdEMsZUFBT0EsR0FBRyxDQUFDQyxPQUFKLENBQWEsV0FBYixFQUEwQixVQUFVQyxLQUFWLEVBQWlCQyxHQUFqQixFQUF1QjtBQUN2RCxpQkFBT0MsTUFBTSxDQUFDQyxZQUFQLENBQXFCRixHQUFyQixDQUFQO0FBQ0EsU0FGTSxDQUFQO0FBR0EsT0FKRDs7QUFLQSxVQUFLLE9BQU83Rix3QkFBUCxLQUFvQyxXQUF6QyxFQUF1RDtBQUN0RHNGLFFBQUFBLG1CQUFtQixHQUFHdEYsd0JBQXdCLENBQUNzRixtQkFBL0M7QUFDQTs7QUFFRCxVQUFLcEYsQ0FBQyxDQUFFd0IsT0FBTyxDQUFDYixXQUFWLENBQUQsQ0FBeUJ3QixNQUF6QixHQUFrQyxDQUF2QyxFQUEyQztBQUUxQ25DLFFBQUFBLENBQUMsQ0FBQ3dCLE9BQU8sQ0FBQ2IsV0FBVCxDQUFELENBQXVCcUMsSUFBdkIsQ0FBNkIsT0FBN0IsRUFBc0MsK0JBQStCbkQsS0FBSyxDQUFDLE1BQUQsQ0FBTCxDQUFjd0QsV0FBZCxFQUFyRTs7QUFFQSxZQUFLckQsQ0FBQyxDQUFFd0IsT0FBTyxDQUFDWCxnQkFBVixDQUFELENBQThCc0IsTUFBOUIsR0FBdUMsQ0FBdkMsSUFBNENyQyx3QkFBd0IsQ0FBQ2xCLFlBQXpCLENBQXNDa0gsWUFBdEMsQ0FBbUQzRCxNQUFuRCxHQUE0RCxDQUE3RyxFQUFpSDtBQUVoSCxjQUFLLEtBQUtuQyxDQUFDLENBQUV3QixPQUFPLENBQUNiLFdBQVYsQ0FBRCxDQUF5QndCLE1BQXpCLEdBQWtDLENBQTVDLEVBQWdEO0FBQy9DbUQsWUFBQUEsb0JBQW9CLEdBQUc5RCxPQUFPLENBQUNiLFdBQVIsR0FBc0IsSUFBN0M7QUFDQTs7QUFFRDBFLFVBQUFBLFNBQVMsR0FBR3ZGLHdCQUF3QixDQUFDbEIsWUFBekIsQ0FBc0NrSCxZQUF0QyxDQUFtREwsT0FBbkQsQ0FBNERMLG1CQUE1RCxFQUFpRixFQUFqRixDQUFaOztBQUVBLGNBQUtDLFNBQVMsS0FBS3hGLEtBQUssQ0FBQyxNQUFELENBQUwsQ0FBY3dELFdBQWQsRUFBbkIsRUFBaUQ7QUFDaERyRCxZQUFBQSxDQUFDLENBQUVzRixvQkFBRixDQUFELENBQTBCUyxJQUExQixDQUFnQ1IsZ0JBQWdCLENBQUV2RixDQUFDLENBQUV3QixPQUFPLENBQUNiLFdBQVYsQ0FBRCxDQUF5QmxDLElBQXpCLENBQStCLFNBQS9CLENBQUYsQ0FBaEQ7QUFDQSxXQUZELE1BRU87QUFDTnVCLFlBQUFBLENBQUMsQ0FBRXNGLG9CQUFGLENBQUQsQ0FBMEJTLElBQTFCLENBQWdDUixnQkFBZ0IsQ0FBRXZGLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQ2IsV0FBVixDQUFELENBQXlCbEMsSUFBekIsQ0FBK0IsYUFBL0IsQ0FBRixDQUFoRDtBQUNBO0FBQ0Q7O0FBRUR1QixRQUFBQSxDQUFDLENBQUN3QixPQUFPLENBQUNaLFNBQVQsRUFBb0JZLE9BQU8sQ0FBQ2IsV0FBNUIsQ0FBRCxDQUEwQ3NFLElBQTFDLENBQWdEcEYsS0FBSyxDQUFDLE1BQUQsQ0FBckQ7QUFDQTtBQUNELEtBck1pQjtBQXFNZjtBQUVIc0YsSUFBQUEsZUFBZSxFQUFFLHlCQUFVdEYsS0FBVixFQUFrQjtBQUNsQyxVQUFJbUcsVUFBVSxHQUFHLFNBQWJBLFVBQWEsR0FBVztBQUMzQmhHLFFBQUFBLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVWdELElBQVYsQ0FBZ0IsVUFBaEIsRUFBNEJuRCxLQUFLLENBQUNvRyxZQUFOLEdBQXFCakcsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVdkIsSUFBVixDQUFnQixpQkFBaEIsQ0FBakQ7QUFDQSxPQUZEOztBQUlBdUIsTUFBQUEsQ0FBQyxDQUFFLEtBQUt3QixPQUFMLENBQWFSLFlBQWYsQ0FBRCxDQUErQjRELElBQS9CLENBQXFDb0IsVUFBckM7QUFDQWhHLE1BQUFBLENBQUMsQ0FBRSxLQUFLd0IsT0FBTCxDQUFhTixxQkFBZixDQUFELENBQXdDMEQsSUFBeEMsQ0FBOENvQixVQUE5QztBQUNBLEtBOU1pQixDQThNZjs7QUE5TWUsR0FBbkIsQ0F4Q3NELENBdVBuRDtBQUdIO0FBQ0E7O0FBQ0FoRyxFQUFBQSxDQUFDLENBQUNrRyxFQUFGLENBQUtoRyxVQUFMLElBQW1CLFVBQVdzQixPQUFYLEVBQXFCO0FBQ3ZDLFdBQU8sS0FBS29ELElBQUwsQ0FBVSxZQUFZO0FBQzVCLFVBQUssQ0FBRTVFLENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0NGLFFBQUFBLENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLEVBQXNDLElBQUlvQixNQUFKLENBQVksSUFBWixFQUFrQkUsT0FBbEIsQ0FBdEM7QUFDQTtBQUNELEtBSk0sQ0FBUDtBQUtBLEdBTkQ7QUFPQSxDQW5RQSxFQW1RRzJFLE1BblFILEVBbVFXNUgsTUFuUVgsRUFtUW1CMEIsUUFuUW5CLEVBbVE2QnpCLGtCQW5RN0I7OztBQ0RELENBQUUsVUFBVXdCLENBQVYsRUFBYztBQUVmLFdBQVNvRyxXQUFULEdBQXVCO0FBQ3RCLFFBQUssTUFBTUMsV0FBVyxDQUFDQyxVQUFaLENBQXVCcEgsSUFBbEMsRUFBeUM7QUFDeENxSCxNQUFBQSxRQUFRLENBQUNDLE1BQVQsQ0FBaUIsSUFBakI7QUFDQTs7QUFDRHhHLElBQUFBLENBQUMsQ0FBRSxxQ0FBRixDQUFELENBQTJDeUcsVUFBM0MsQ0FBdUQsVUFBdkQ7QUFDQXpHLElBQUFBLENBQUMsQ0FBRSxtQkFBRixDQUFELENBQXlCMEcsS0FBekIsQ0FBZ0MsVUFBVWpELEtBQVYsRUFBa0I7QUFDakRBLE1BQUFBLEtBQUssQ0FBQ2tELGNBQU47QUFDQSxVQUFJQyxPQUFPLEdBQUk1RyxDQUFDLENBQUUsSUFBRixDQUFoQjtBQUNBLFVBQUk2RyxPQUFPLEdBQUk3RyxDQUFDLENBQUUsb0JBQUYsRUFBd0JBLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVThHLE1BQVYsRUFBeEIsQ0FBaEI7QUFDQSxVQUFJQyxPQUFPLEdBQUkvRyxDQUFDLENBQUUsUUFBRixFQUFZQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVU4RyxNQUFWLEVBQVosQ0FBaEI7QUFDQSxVQUFJcEksUUFBUSxHQUFHcUIsNEJBQWYsQ0FMaUQsQ0FNakQ7O0FBQ0EsVUFBSyxDQUFFLDRCQUFQLEVBQXNDO0FBQ3JDQyxRQUFBQSxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQnVFLFdBQTFCLENBQXVDLDBFQUF2QztBQUNBLE9BVGdELENBVWpEOzs7QUFDQXFDLE1BQUFBLE9BQU8sQ0FBQzNCLElBQVIsQ0FBYyxZQUFkLEVBQTZCVCxRQUE3QixDQUF1QyxtQkFBdkMsRUFYaUQsQ0FhakQ7O0FBQ0F4RSxNQUFBQSxDQUFDLENBQUUsbUJBQUYsQ0FBRCxDQUF5QndFLFFBQXpCLENBQW1DLG1CQUFuQyxFQWRpRCxDQWdCakQ7O0FBQ0EsVUFBSS9GLElBQUksR0FBRyxFQUFYO0FBQ0EsVUFBSXVJLFdBQVcsR0FBR2hILENBQUMsQ0FBRSw0QkFBRixDQUFELENBQWtDdUMsR0FBbEMsRUFBbEI7O0FBQ0EsVUFBSyxxQkFBcUJ5RSxXQUExQixFQUF3QztBQUN2Q3ZJLFFBQUFBLElBQUksR0FBRztBQUNOLG9CQUFXLHFCQURMO0FBRU4sb0RBQTJDbUksT0FBTyxDQUFDbkksSUFBUixDQUFjLGVBQWQsQ0FGckM7QUFHTix5QkFBZ0J1QixDQUFDLENBQUUsMkJBQUYsQ0FBRCxDQUFnQ3VDLEdBQWhDLEVBSFY7QUFJTiwwQkFBZ0J2QyxDQUFDLENBQUUsNEJBQUYsQ0FBRCxDQUFpQ3VDLEdBQWpDLEVBSlY7QUFLTix5QkFBZ0J2QyxDQUFDLENBQUUsd0JBQXdCNEcsT0FBTyxDQUFDckUsR0FBUixFQUF4QixHQUF3QyxJQUExQyxDQUFELENBQWtEQSxHQUFsRCxFQUxWO0FBTU4scUJBQVlxRSxPQUFPLENBQUNyRSxHQUFSLEVBTk47QUFPTixxQkFBWTtBQVBOLFNBQVA7QUFVQXZDLFFBQUFBLENBQUMsQ0FBQ2lILElBQUYsQ0FBUXZJLFFBQVEsQ0FBQ3dJLE9BQWpCLEVBQTBCekksSUFBMUIsRUFBZ0MsVUFBVTBJLFFBQVYsRUFBcUI7QUFDcEQ7QUFDQSxjQUFLLFNBQVNBLFFBQVEsQ0FBQ0MsT0FBdkIsRUFBaUM7QUFDaEM7QUFDQVIsWUFBQUEsT0FBTyxDQUFDckUsR0FBUixDQUFhNEUsUUFBUSxDQUFDMUksSUFBVCxDQUFjNEksWUFBM0IsRUFBMENwQyxJQUExQyxDQUFnRGtDLFFBQVEsQ0FBQzFJLElBQVQsQ0FBYzZJLFlBQTlELEVBQTZFL0MsV0FBN0UsQ0FBMEYsbUJBQTFGLEVBQWdIQyxRQUFoSCxDQUEwSDJDLFFBQVEsQ0FBQzFJLElBQVQsQ0FBYzhJLFlBQXhJLEVBQXVKdkUsSUFBdkosQ0FBNkptRSxRQUFRLENBQUMxSSxJQUFULENBQWMrSSxXQUEzSyxFQUF3TCxJQUF4TDtBQUNBWCxZQUFBQSxPQUFPLENBQUNkLElBQVIsQ0FBY29CLFFBQVEsQ0FBQzFJLElBQVQsQ0FBY2dKLE9BQTVCLEVBQXNDakQsUUFBdEMsQ0FBZ0QsK0JBQStCMkMsUUFBUSxDQUFDMUksSUFBVCxDQUFjaUosYUFBN0Y7O0FBQ0EsZ0JBQUssSUFBSVgsT0FBTyxDQUFDNUUsTUFBakIsRUFBMEI7QUFDekI0RSxjQUFBQSxPQUFPLENBQUMvRCxJQUFSLENBQWMsVUFBZCxFQUEwQixJQUExQjtBQUNBOztBQUNEaEQsWUFBQUEsQ0FBQyxDQUFFLG1CQUFGLENBQUQsQ0FBeUI4QyxHQUF6QixDQUE4QjhELE9BQTlCLEVBQXdDckUsR0FBeEMsQ0FBNkM0RSxRQUFRLENBQUMxSSxJQUFULENBQWM0SSxZQUEzRCxFQUEwRU0sSUFBMUUsQ0FBZ0YsVUFBaEYsRUFBNEYsSUFBNUY7QUFDQSxXQVJELE1BUU87QUFDTjtBQUNBO0FBQ0EsZ0JBQUssZ0JBQWdCLE9BQU9SLFFBQVEsQ0FBQzFJLElBQVQsQ0FBY21KLHFCQUExQyxFQUFrRTtBQUNqRSxrQkFBSyxPQUFPVCxRQUFRLENBQUMxSSxJQUFULENBQWM2SSxZQUExQixFQUF5QztBQUN4Q1YsZ0JBQUFBLE9BQU8sQ0FBQzNDLElBQVI7QUFDQTJDLGdCQUFBQSxPQUFPLENBQUNyRSxHQUFSLENBQWE0RSxRQUFRLENBQUMxSSxJQUFULENBQWM0SSxZQUEzQixFQUEwQ3BDLElBQTFDLENBQWdEa0MsUUFBUSxDQUFDMUksSUFBVCxDQUFjNkksWUFBOUQsRUFBNkUvQyxXQUE3RSxDQUEwRixtQkFBMUYsRUFBZ0hDLFFBQWhILENBQTBIMkMsUUFBUSxDQUFDMUksSUFBVCxDQUFjOEksWUFBeEksRUFBdUp2RSxJQUF2SixDQUE2Sm1FLFFBQVEsQ0FBQzFJLElBQVQsQ0FBYytJLFdBQTNLLEVBQXdMLElBQXhMO0FBQ0EsZUFIRCxNQUdPO0FBQ05aLGdCQUFBQSxPQUFPLENBQUM1QyxJQUFSO0FBQ0E7QUFDRCxhQVBELE1BT087QUFDTmhFLGNBQUFBLENBQUMsQ0FBRSxRQUFGLEVBQVkrRyxPQUFaLENBQUQsQ0FBdUJuQyxJQUF2QixDQUE2QixVQUFVaUQsQ0FBVixFQUFjO0FBQzFDLG9CQUFLN0gsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVdUMsR0FBVixPQUFvQjRFLFFBQVEsQ0FBQzFJLElBQVQsQ0FBY21KLHFCQUF2QyxFQUErRDtBQUM5RDVILGtCQUFBQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVU4SCxNQUFWO0FBQ0E7QUFDRCxlQUpEOztBQUtBLGtCQUFLLE9BQU9YLFFBQVEsQ0FBQzFJLElBQVQsQ0FBYzZJLFlBQTFCLEVBQXlDO0FBQ3hDVixnQkFBQUEsT0FBTyxDQUFDM0MsSUFBUjtBQUNBMkMsZ0JBQUFBLE9BQU8sQ0FBQ3JFLEdBQVIsQ0FBYTRFLFFBQVEsQ0FBQzFJLElBQVQsQ0FBYzRJLFlBQTNCLEVBQTBDcEMsSUFBMUMsQ0FBZ0RrQyxRQUFRLENBQUMxSSxJQUFULENBQWM2SSxZQUE5RCxFQUE2RS9DLFdBQTdFLENBQTBGLG1CQUExRixFQUFnSEMsUUFBaEgsQ0FBMEgyQyxRQUFRLENBQUMxSSxJQUFULENBQWM4SSxZQUF4SSxFQUF1SnZFLElBQXZKLENBQTZKbUUsUUFBUSxDQUFDMUksSUFBVCxDQUFjK0ksV0FBM0ssRUFBd0wsSUFBeEw7QUFDQSxlQUhELE1BR087QUFDTlosZ0JBQUFBLE9BQU8sQ0FBQzVDLElBQVI7QUFDQTtBQUNELGFBdEJLLENBdUJOOzs7QUFDQWhFLFlBQUFBLENBQUMsQ0FBRSxtQkFBRixDQUFELENBQXlCOEMsR0FBekIsQ0FBOEI4RCxPQUE5QixFQUF3Q3JDLFdBQXhDLENBQXFELG1CQUFyRDtBQUNBc0MsWUFBQUEsT0FBTyxDQUFDZCxJQUFSLENBQWNvQixRQUFRLENBQUMxSSxJQUFULENBQWNnSixPQUE1QixFQUFzQ2pELFFBQXRDLENBQWdELCtCQUErQjJDLFFBQVEsQ0FBQzFJLElBQVQsQ0FBY2lKLGFBQTdGO0FBQ0E7QUFFRCxTQXRDRDtBQXVDQTtBQUNELEtBdEVEO0FBdUVBOztBQUVEMUgsRUFBQUEsQ0FBQyxDQUFFQyxRQUFGLENBQUQsQ0FBYzhILEtBQWQsQ0FBcUIsWUFBVztBQUMvQixRQUFLLElBQUkvSCxDQUFDLENBQUUsNEJBQUYsQ0FBRCxDQUFrQ21DLE1BQTNDLEVBQW9EO0FBQ25EaUUsTUFBQUEsV0FBVztBQUNYO0FBQ0QsR0FKRDtBQU1BcEcsRUFBQUEsQ0FBQyxDQUFFLGlCQUFGLENBQUQsQ0FBdUIwRyxLQUF2QixDQUE4QixVQUFVakQsS0FBVixFQUFrQjtBQUMvQ0EsSUFBQUEsS0FBSyxDQUFDa0QsY0FBTjtBQUNBSixJQUFBQSxRQUFRLENBQUNDLE1BQVQ7QUFDQSxHQUhEO0FBS0EsQ0EzRkQsRUEyRktMLE1BM0ZMOzs7QUNBQSxDQUFFLFVBQVVuRyxDQUFWLEVBQWM7QUFDZixXQUFTZ0ksc0NBQVQsQ0FBaUQ5SSxJQUFqRCxFQUF1RCtJLFFBQXZELEVBQWlFQyxNQUFqRSxFQUF5RUMsS0FBekUsRUFBZ0ZDLEtBQWhGLEVBQXdGO0FBQ3ZGLFFBQUssT0FBT2hHLEVBQVAsS0FBYyxXQUFuQixFQUFpQztBQUNoQyxVQUFLLE9BQU9nRyxLQUFQLEtBQWlCLFdBQXRCLEVBQW9DO0FBQ25DaEcsUUFBQUEsRUFBRSxDQUFFLE1BQUYsRUFBVWxELElBQVYsRUFBZ0IrSSxRQUFoQixFQUEwQkMsTUFBMUIsRUFBa0NDLEtBQWxDLENBQUY7QUFDQSxPQUZELE1BRU87QUFDTi9GLFFBQUFBLEVBQUUsQ0FBRSxNQUFGLEVBQVVsRCxJQUFWLEVBQWdCK0ksUUFBaEIsRUFBMEJDLE1BQTFCLEVBQWtDQyxLQUFsQyxFQUF5Q0MsS0FBekMsQ0FBRjtBQUNBO0FBQ0QsS0FORCxNQU1PO0FBQ047QUFDQTtBQUNEOztBQUVEcEksRUFBQUEsQ0FBQyxDQUFFQyxRQUFGLENBQUQsQ0FBYzhILEtBQWQsQ0FBcUIsWUFBVztBQUMvQi9ILElBQUFBLENBQUMsQ0FBRSxzQ0FBRixDQUFELENBQTRDMEcsS0FBNUMsQ0FBbUQsVUFBVWpELEtBQVYsRUFBa0I7QUFDcEUsVUFBSTJFLEtBQUssR0FBRyxFQUFaOztBQUNBLFVBQUtwSSxDQUFDLENBQUUsS0FBRixFQUFTQSxDQUFDLENBQUUsSUFBRixDQUFWLENBQUQsQ0FBc0JtQyxNQUF0QixHQUErQixDQUFwQyxFQUF3QztBQUN2Q2lHLFFBQUFBLEtBQUssR0FBR3BJLENBQUMsQ0FBRSxLQUFGLEVBQVNBLENBQUMsQ0FBRSxJQUFGLENBQVYsQ0FBRCxDQUFzQjJILElBQXRCLENBQTRCLE9BQTVCLElBQXdDLEdBQWhEO0FBQ0E7O0FBQ0RTLE1BQUFBLEtBQUssR0FBR0EsS0FBSyxHQUFHcEksQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVaUYsSUFBVixFQUFoQjtBQUNBK0MsTUFBQUEsc0NBQXNDLENBQUUsT0FBRixFQUFXLHNCQUFYLEVBQW1DLFlBQVlJLEtBQS9DLEVBQXNEN0IsUUFBUSxDQUFDOEIsUUFBL0QsQ0FBdEM7QUFDQSxLQVBEO0FBUUEsR0FURDtBQVdBLENBeEJELEVBd0JLbEMsTUF4Qkw7OztBQ0FBO0FBQ0E7O0FBQUMsQ0FBQyxVQUFXbkcsQ0FBWCxFQUFjekIsTUFBZCxFQUFzQjBCLFFBQXRCLEVBQWdDekIsa0JBQWhDLEVBQW9EOEosU0FBcEQsRUFBZ0U7QUFFakU7QUFDQSxNQUFJcEksVUFBVSxHQUFHLG9CQUFqQjtBQUFBLE1BQ0FDLFFBQVEsR0FBRztBQUNWLGFBQVUsS0FEQTtBQUNPO0FBQ2pCLHFCQUFrQixZQUZSO0FBR1Ysb0NBQWlDLG1DQUh2QjtBQUlWLHlDQUFzQyxRQUo1QjtBQUtWLHdCQUFxQiw2QkFMWDtBQU1WLDhCQUEyQiw0QkFOakI7QUFPVixxQ0FBa0MsdUJBUHhCO0FBUVYscUJBQWtCLHVCQVJSO0FBU1YscUNBQWtDLGlCQVR4QjtBQVVWLHdDQUFxQyx3QkFWM0I7QUFXVixpQ0FBOEI7QUFYcEIsR0FEWCxDQUhpRSxDQWdCOUQ7QUFFSDs7QUFDQSxXQUFTbUIsTUFBVCxDQUFpQkMsT0FBakIsRUFBMEJDLE9BQTFCLEVBQW9DO0FBRW5DLFNBQUtELE9BQUwsR0FBZUEsT0FBZixDQUZtQyxDQUluQztBQUNBO0FBQ0E7QUFDQTs7QUFDQSxTQUFLQyxPQUFMLEdBQWV4QixDQUFDLENBQUN5QixNQUFGLENBQVUsRUFBVixFQUFjdEIsUUFBZCxFQUF3QnFCLE9BQXhCLENBQWY7QUFFQSxTQUFLRSxTQUFMLEdBQWlCdkIsUUFBakI7QUFDQSxTQUFLd0IsS0FBTCxHQUFhekIsVUFBYjtBQUVBLFNBQUswQixJQUFMO0FBQ0EsR0FqQ2dFLENBaUMvRDs7O0FBRUZOLEVBQUFBLE1BQU0sQ0FBQ3hDLFNBQVAsR0FBbUI7QUFFbEI4QyxJQUFBQSxJQUFJLEVBQUUsY0FBVTJHLEtBQVYsRUFBaUJ2SixNQUFqQixFQUEwQjtBQUMvQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFLd0osY0FBTCxDQUFxQixLQUFLakgsT0FBMUIsRUFBbUMsS0FBS0MsT0FBeEM7QUFDQSxXQUFLaUgsWUFBTCxDQUFtQixLQUFLbEgsT0FBeEIsRUFBaUMsS0FBS0MsT0FBdEM7QUFDQSxXQUFLa0gsZUFBTCxDQUFzQixLQUFLbkgsT0FBM0IsRUFBb0MsS0FBS0MsT0FBekM7QUFDQSxLQVppQjtBQWNsQmdILElBQUFBLGNBQWMsRUFBRSx3QkFBVWpILE9BQVYsRUFBbUJDLE9BQW5CLEVBQTZCO0FBQzVDeEIsTUFBQUEsQ0FBQyxDQUFDLDhCQUFELEVBQWlDdUIsT0FBakMsQ0FBRCxDQUEyQ21GLEtBQTNDLENBQWlELFVBQVNpQyxDQUFULEVBQVk7QUFDNUQsWUFBSWpGLE1BQU0sR0FBRzFELENBQUMsQ0FBQzJJLENBQUMsQ0FBQ2pGLE1BQUgsQ0FBZDs7QUFDQSxZQUFJQSxNQUFNLENBQUNvRCxNQUFQLENBQWMsZ0JBQWQsRUFBZ0MzRSxNQUFoQyxJQUEwQyxDQUExQyxJQUErQ29FLFFBQVEsQ0FBQzhCLFFBQVQsQ0FBa0I1QyxPQUFsQixDQUEwQixLQUExQixFQUFnQyxFQUFoQyxLQUF1QyxLQUFLNEMsUUFBTCxDQUFjNUMsT0FBZCxDQUFzQixLQUF0QixFQUE0QixFQUE1QixDQUF0RixJQUF5SGMsUUFBUSxDQUFDcUMsUUFBVCxJQUFxQixLQUFLQSxRQUF2SixFQUFpSztBQUNoSyxjQUFJbEYsTUFBTSxHQUFHMUQsQ0FBQyxDQUFDLEtBQUs2SSxJQUFOLENBQWQ7QUFDQW5GLFVBQUFBLE1BQU0sR0FBR0EsTUFBTSxDQUFDdkIsTUFBUCxHQUFnQnVCLE1BQWhCLEdBQXlCMUQsQ0FBQyxDQUFDLFdBQVcsS0FBSzZJLElBQUwsQ0FBVXJGLEtBQVYsQ0FBZ0IsQ0FBaEIsQ0FBWCxHQUErQixHQUFoQyxDQUFuQzs7QUFDQSxjQUFJRSxNQUFNLENBQUN2QixNQUFYLEVBQW1CO0FBQ2xCbkMsWUFBQUEsQ0FBQyxDQUFDLFdBQUQsQ0FBRCxDQUFlOEksT0FBZixDQUF1QjtBQUN0QkMsY0FBQUEsU0FBUyxFQUFFckYsTUFBTSxDQUFDc0YsTUFBUCxHQUFnQkM7QUFETCxhQUF2QixFQUVHLElBRkg7QUFHQSxtQkFBTyxLQUFQO0FBQ0E7QUFDRDtBQUNELE9BWkQ7QUFhQSxLQTVCaUI7QUE0QmY7QUFFSFIsSUFBQUEsWUFBWSxFQUFFLHNCQUFVbEgsT0FBVixFQUFtQkMsT0FBbkIsRUFBNkI7QUFDMUMsVUFBSWlELElBQUksR0FBRyxJQUFYO0FBQ0EsVUFBSXpGLE1BQU0sR0FBRyxDQUFiO0FBQ0EsVUFBSWEsS0FBSyxHQUFHLEVBQVo7QUFDQSxVQUFJcUosWUFBWSxHQUFHLENBQW5CO0FBQ0EsVUFBSXJFLGdCQUFnQixHQUFHLEVBQXZCO0FBQ0EsVUFBSTVGLFNBQVMsR0FBRyxFQUFoQjtBQUNBLFVBQUk4RixjQUFjLEdBQUcsRUFBckI7O0FBRUEsVUFBSy9FLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQzJILGdCQUFWLENBQUQsQ0FBOEJoSCxNQUE5QixHQUF1QyxDQUE1QyxFQUFnRDtBQUMvQ25DLFFBQUFBLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQzRILDZCQUFWLEVBQXlDN0gsT0FBekMsQ0FBRCxDQUFvRHFELElBQXBELENBQXlELFlBQVc7QUFDbkU1RSxVQUFBQSxDQUFDLENBQUV3QixPQUFPLENBQUM2SCxhQUFWLEVBQXlCckosQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ3NKLE9BQXBDLENBQTZDLHdCQUE3QztBQUNBLFNBRkQ7QUFHQXRKLFFBQUFBLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQytILDRCQUFWLEVBQXdDaEksT0FBeEMsQ0FBRCxDQUFtRGtCLEVBQW5ELENBQXNELFFBQXRELEVBQWdFLFVBQVVnQixLQUFWLEVBQWlCO0FBQ2hGeUYsVUFBQUEsWUFBWSxHQUFHbEosQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRdkIsSUFBUixDQUFhLHFCQUFiLENBQWY7QUFDQW9HLFVBQUFBLGdCQUFnQixHQUFHN0UsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRdUMsR0FBUixFQUFuQjtBQUNBdEQsVUFBQUEsU0FBUyxHQUFHNEYsZ0JBQWdCLENBQUNDLEtBQWpCLENBQXVCLEtBQXZCLEVBQThCLENBQTlCLENBQVo7QUFDQUMsVUFBQUEsY0FBYyxHQUFHRixnQkFBZ0IsQ0FBQ0MsS0FBakIsQ0FBdUIsS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBakI7O0FBQ0EsY0FBSyxPQUFPb0UsWUFBUCxLQUF3QixXQUE3QixFQUEyQztBQUUxQ2xKLFlBQUFBLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQzRILDZCQUFWLEVBQXlDN0gsT0FBekMsQ0FBRCxDQUFtRGdELFdBQW5ELENBQWdFLFNBQWhFO0FBQ0F2RSxZQUFBQSxDQUFDLENBQUV3QixPQUFPLENBQUNnSSxzQkFBVixFQUFrQ2pJLE9BQWxDLENBQUQsQ0FBNENnRCxXQUE1QyxDQUF5RCxRQUF6RDtBQUNBdkUsWUFBQUEsQ0FBQyxDQUFFeUQsS0FBSyxDQUFDQyxNQUFSLENBQUQsQ0FBa0IrRixPQUFsQixDQUEyQmpJLE9BQU8sQ0FBQzRILDZCQUFuQyxFQUFtRTVFLFFBQW5FLENBQTZFLFNBQTdFOztBQUVBLGdCQUFLdkYsU0FBUyxJQUFJLENBQWxCLEVBQXNCO0FBQ3JCZSxjQUFBQSxDQUFDLENBQUV3QixPQUFPLENBQUNrSSx5QkFBVixFQUFxQzFKLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQ2dJLHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDTixZQUF6QyxDQUF0QyxDQUFELENBQWlHM0csR0FBakcsQ0FBc0d2QyxDQUFDLENBQUV3QixPQUFPLENBQUNtSSxhQUFWLEVBQXlCM0osQ0FBQyxDQUFFd0IsT0FBTyxDQUFDZ0ksc0JBQVIsR0FBaUMsR0FBakMsR0FBdUNOLFlBQXpDLENBQTFCLENBQUQsQ0FBcUZ6SyxJQUFyRixDQUEwRixnQkFBMUYsQ0FBdEc7QUFDQSxhQUZELE1BRU8sSUFBS1EsU0FBUyxJQUFJLEVBQWxCLEVBQXVCO0FBQzdCZSxjQUFBQSxDQUFDLENBQUV3QixPQUFPLENBQUNrSSx5QkFBVixFQUFxQzFKLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQ2dJLHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDTixZQUF6QyxDQUF0QyxDQUFELENBQWlHM0csR0FBakcsQ0FBc0d2QyxDQUFDLENBQUV3QixPQUFPLENBQUNtSSxhQUFWLEVBQXlCM0osQ0FBQyxDQUFFd0IsT0FBTyxDQUFDZ0ksc0JBQVIsR0FBaUMsR0FBakMsR0FBdUNOLFlBQXpDLENBQTFCLENBQUQsQ0FBcUZ6SyxJQUFyRixDQUEwRixpQkFBMUYsQ0FBdEc7QUFDQTs7QUFFRE8sWUFBQUEsTUFBTSxHQUFHZ0IsQ0FBQyxDQUFFd0IsT0FBTyxDQUFDa0kseUJBQVIsR0FBb0MsNkJBQXBDLEdBQW9FUixZQUFwRSxHQUFtRixJQUFyRixDQUFELENBQTRGM0csR0FBNUYsRUFBVDtBQUVBMUMsWUFBQUEsS0FBSyxHQUFHNEUsSUFBSSxDQUFDMUYsVUFBTCxDQUFpQkMsTUFBakIsRUFBeUJDLFNBQXpCLEVBQW9DOEYsY0FBcEMsRUFBb0R4RCxPQUFwRCxFQUE2REMsT0FBN0QsQ0FBUjtBQUNBaUQsWUFBQUEsSUFBSSxDQUFDbUYsZUFBTCxDQUFzQi9FLGdCQUF0QixFQUF3Q2hGLEtBQUssQ0FBQyxNQUFELENBQTdDLEVBQXVEMEIsT0FBdkQsRUFBZ0VDLE9BQWhFO0FBRUEsV0FqQkQsTUFpQk8sSUFBS3hCLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQ3FJLDZCQUFWLENBQUQsQ0FBMkMxSCxNQUEzQyxHQUFvRCxDQUF6RCxFQUE2RDtBQUNuRW5DLFlBQUFBLENBQUMsQ0FBQ3dCLE9BQU8sQ0FBQ3FJLDZCQUFULEVBQXdDdEksT0FBeEMsQ0FBRCxDQUFrRDBELElBQWxELENBQXVERixjQUF2RDtBQUNBL0UsWUFBQUEsQ0FBQyxDQUFFd0IsT0FBTyxDQUFDZ0ksc0JBQVYsQ0FBRCxDQUFvQzVFLElBQXBDLENBQTBDLFlBQVc7QUFDcERzRSxjQUFBQSxZQUFZLEdBQUdsSixDQUFDLENBQUN3QixPQUFPLENBQUNrSSx5QkFBVCxFQUFvQzFKLENBQUMsQ0FBQyxJQUFELENBQXJDLENBQUQsQ0FBOEN2QixJQUE5QyxDQUFtRCxxQkFBbkQsQ0FBZjs7QUFDQSxrQkFBSyxPQUFPeUssWUFBUCxLQUF3QixXQUE3QixFQUEyQztBQUMxQ2xLLGdCQUFBQSxNQUFNLEdBQUdnQixDQUFDLENBQUV3QixPQUFPLENBQUNrSSx5QkFBVixFQUFxQzFKLENBQUMsQ0FBQyxJQUFELENBQXRDLENBQUQsQ0FBZ0R1QyxHQUFoRCxFQUFUO0FBQ0ExQyxnQkFBQUEsS0FBSyxHQUFHNEUsSUFBSSxDQUFDMUYsVUFBTCxDQUFpQkMsTUFBakIsRUFBeUJDLFNBQXpCLEVBQW9DOEYsY0FBcEMsRUFBb0R4RCxPQUFwRCxFQUE2REMsT0FBN0QsQ0FBUjtBQUNBO0FBQ0QsYUFORDtBQU9BOztBQUVEaUQsVUFBQUEsSUFBSSxDQUFDcUYsbUJBQUwsQ0FBMEJqRixnQkFBMUIsRUFBNENoRixLQUFLLENBQUMsTUFBRCxDQUFqRCxFQUEyRDBCLE9BQTNELEVBQW9FQyxPQUFwRTtBQUVBLFNBbkNEO0FBb0NBOztBQUNELFVBQUt4QixDQUFDLENBQUV3QixPQUFPLENBQUN1SSxnQ0FBVixDQUFELENBQThDNUgsTUFBOUMsR0FBdUQsQ0FBNUQsRUFBZ0U7QUFDL0RuQyxRQUFBQSxDQUFDLENBQUV3QixPQUFPLENBQUN1SSxnQ0FBVixFQUE0Q3hJLE9BQTVDLENBQUQsQ0FBdURtRixLQUF2RCxDQUE4RCxVQUFVakQsS0FBVixFQUFrQjtBQUMvRXlGLFVBQUFBLFlBQVksR0FBR2xKLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQytILDRCQUFWLEVBQXdDaEksT0FBeEMsQ0FBRCxDQUFtRDlDLElBQW5ELENBQXdELHFCQUF4RCxDQUFmO0FBQ0F1QixVQUFBQSxDQUFDLENBQUV3QixPQUFPLENBQUM0SCw2QkFBVixFQUF5QzdILE9BQXpDLENBQUQsQ0FBbURnRCxXQUFuRCxDQUFnRSxTQUFoRTtBQUNBdkUsVUFBQUEsQ0FBQyxDQUFFd0IsT0FBTyxDQUFDZ0ksc0JBQVYsRUFBa0NqSSxPQUFsQyxDQUFELENBQTRDZ0QsV0FBNUMsQ0FBeUQsUUFBekQ7QUFDQXZFLFVBQUFBLENBQUMsQ0FBRXlELEtBQUssQ0FBQ0MsTUFBUixDQUFELENBQWtCK0YsT0FBbEIsQ0FBMkJqSSxPQUFPLENBQUM0SCw2QkFBbkMsRUFBbUU1RSxRQUFuRSxDQUE2RSxTQUE3RTtBQUNBSyxVQUFBQSxnQkFBZ0IsR0FBRzdFLENBQUMsQ0FBQ3dCLE9BQU8sQ0FBQytILDRCQUFULEVBQXVDdkosQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFROEcsTUFBUixFQUF2QyxDQUFELENBQTJEdkUsR0FBM0QsRUFBbkI7QUFDQXRELFVBQUFBLFNBQVMsR0FBRzRGLGdCQUFnQixDQUFDQyxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFaO0FBQ0E5RixVQUFBQSxNQUFNLEdBQUdnQixDQUFDLENBQUV3QixPQUFPLENBQUNrSSx5QkFBUixHQUFvQyw2QkFBcEMsR0FBb0VSLFlBQXBFLEdBQW1GLElBQXJGLENBQUQsQ0FBNEYzRyxHQUE1RixFQUFUO0FBQ0ExQyxVQUFBQSxLQUFLLEdBQUc0RSxJQUFJLENBQUMxRixVQUFMLENBQWlCQyxNQUFqQixFQUF5QkMsU0FBekIsRUFBb0M4RixjQUFwQyxFQUFvRHhELE9BQXBELEVBQTZEQyxPQUE3RCxDQUFSO0FBQ0FpQyxVQUFBQSxLQUFLLENBQUNrRCxjQUFOO0FBQ0EsU0FWRDtBQVdBO0FBQ0QsS0E3RmlCO0FBNkZmO0FBRUg1SCxJQUFBQSxVQUFVLEVBQUUsb0JBQVVDLE1BQVYsRUFBa0JDLFNBQWxCLEVBQTZCQyxJQUE3QixFQUFtQ3FDLE9BQW5DLEVBQTRDQyxPQUE1QyxFQUFzRDtBQUNqRSxVQUFJM0IsS0FBSyxHQUFHckIsa0JBQWtCLENBQUNPLFVBQW5CLENBQStCQyxNQUEvQixFQUF1Q0MsU0FBdkMsRUFBa0RDLElBQWxELENBQVo7QUFFQWMsTUFBQUEsQ0FBQyxDQUFDLElBQUQsRUFBT3dCLE9BQU8sQ0FBQzRILDZCQUFmLENBQUQsQ0FBK0N4RSxJQUEvQyxDQUFxRCxZQUFXO0FBQy9ELFlBQUs1RSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFpRixJQUFSLE1BQWtCcEYsS0FBSyxDQUFDLE1BQUQsQ0FBNUIsRUFBdUM7QUFDdENHLFVBQUFBLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQ2dJLHNCQUFWLEVBQWtDakksT0FBbEMsQ0FBRCxDQUE0Q2dELFdBQTVDLENBQXlELFFBQXpEO0FBQ0F2RSxVQUFBQSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVE4RyxNQUFSLEdBQWlCQSxNQUFqQixHQUEwQnRDLFFBQTFCLENBQW9DLFFBQXBDO0FBQ0E7QUFDRCxPQUxEO0FBT0EsYUFBTzNFLEtBQVA7QUFDQSxLQTFHaUI7QUEwR2Y7QUFFSCtKLElBQUFBLGVBQWUsRUFBRSx5QkFBVUksUUFBVixFQUFvQm5LLEtBQXBCLEVBQTJCMEIsT0FBM0IsRUFBb0NDLE9BQXBDLEVBQThDO0FBQzlEeEIsTUFBQUEsQ0FBQyxDQUFFd0IsT0FBTyxDQUFDNEgsNkJBQVYsQ0FBRCxDQUEyQ3hFLElBQTNDLENBQWlELFlBQVc7QUFDM0QsWUFBSXFGLEtBQUssR0FBWWpLLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQ21JLGFBQVYsRUFBeUIzSixDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9DaUYsSUFBcEMsRUFBckI7QUFDQSxZQUFJaUYsV0FBVyxHQUFNbEssQ0FBQyxDQUFFd0IsT0FBTyxDQUFDbUksYUFBVixFQUF5QjNKLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0N2QixJQUFwQyxDQUF5QyxPQUF6QyxDQUFyQjtBQUNBLFlBQUkwTCxVQUFVLEdBQU9uSyxDQUFDLENBQUV3QixPQUFPLENBQUNtSSxhQUFWLEVBQXlCM0osQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ3ZCLElBQXBDLENBQXlDLE1BQXpDLENBQXJCO0FBQ0EsWUFBSTJMLFVBQVUsR0FBT3BLLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQ21JLGFBQVYsRUFBeUIzSixDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9DdkIsSUFBcEMsQ0FBeUMsVUFBekMsQ0FBckI7QUFDQSxZQUFJc0csY0FBYyxHQUFHaUYsUUFBUSxDQUFDbEYsS0FBVCxDQUFlLEtBQWYsRUFBc0IsQ0FBdEIsQ0FBckI7QUFDQSxZQUFJN0YsU0FBUyxHQUFRRyxRQUFRLENBQUU0SyxRQUFRLENBQUNsRixLQUFULENBQWUsS0FBZixFQUFzQixDQUF0QixDQUFGLENBQTdCO0FBRUE5RSxRQUFBQSxDQUFDLENBQUV3QixPQUFPLENBQUMrSCw0QkFBVixDQUFELENBQTBDaEgsR0FBMUMsQ0FBK0N5SCxRQUEvQztBQUNBaEssUUFBQUEsQ0FBQyxDQUFFd0IsT0FBTyxDQUFDK0gsNEJBQVYsQ0FBRCxDQUEwQ3ZHLElBQTFDLENBQWdELFVBQWhELEVBQTREZ0gsUUFBNUQ7O0FBRUEsWUFBS2pGLGNBQWMsSUFBSSxXQUF2QixFQUFxQztBQUNwQ2tGLFVBQUFBLEtBQUssR0FBR0MsV0FBUjtBQUNBbEssVUFBQUEsQ0FBQyxDQUFFd0IsT0FBTyxDQUFDbUksYUFBVixFQUF5QjNKLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0N1RSxXQUFwQyxDQUFpRCxTQUFqRDtBQUNBLFNBSEQsTUFHTyxJQUFLUSxjQUFjLElBQUksVUFBdkIsRUFBb0M7QUFDMUNrRixVQUFBQSxLQUFLLEdBQUdFLFVBQVI7QUFDQW5LLFVBQUFBLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQ21JLGFBQVYsRUFBeUIzSixDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9Dd0UsUUFBcEMsQ0FBOEMsU0FBOUM7QUFDQSxTQUhNLE1BR0EsSUFBSU8sY0FBYyxJQUFJLFVBQXRCLEVBQW1DO0FBQ3pDa0YsVUFBQUEsS0FBSyxHQUFHRyxVQUFSO0FBQ0FwSyxVQUFBQSxDQUFDLENBQUV3QixPQUFPLENBQUNtSSxhQUFWLEVBQXlCM0osQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ3dFLFFBQXBDLENBQTZDLFNBQTdDO0FBQ0E7O0FBRUR4RSxRQUFBQSxDQUFDLENBQUV3QixPQUFPLENBQUNtSSxhQUFWLEVBQXlCM0osQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ2lGLElBQXBDLENBQTBDZ0YsS0FBMUM7QUFDQWpLLFFBQUFBLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQytILDRCQUFWLEVBQXdDdkosQ0FBQyxDQUFDLElBQUQsQ0FBekMsQ0FBRCxDQUFtRHZCLElBQW5ELENBQXlELFdBQXpELEVBQXNFUSxTQUF0RTtBQUVBLE9BekJEO0FBMEJBLEtBdklpQjtBQXVJZjtBQUVINkssSUFBQUEsbUJBQW1CLEVBQUUsNkJBQVVFLFFBQVYsRUFBb0JuSyxLQUFwQixFQUEyQjBCLE9BQTNCLEVBQW9DQyxPQUFwQyxFQUE4QztBQUNsRXhCLE1BQUFBLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQzRILDZCQUFWLENBQUQsQ0FBMkN4RSxJQUEzQyxDQUFpRCxZQUFXO0FBQzNELFlBQUlxRixLQUFLLEdBQVlqSyxDQUFDLENBQUV3QixPQUFPLENBQUNtSSxhQUFWLEVBQXlCM0osQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ2lGLElBQXBDLEVBQXJCO0FBQ0EsWUFBSWlGLFdBQVcsR0FBTWxLLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQ21JLGFBQVYsRUFBeUIzSixDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9DdkIsSUFBcEMsQ0FBeUMsT0FBekMsQ0FBckI7QUFDQSxZQUFJMEwsVUFBVSxHQUFPbkssQ0FBQyxDQUFFd0IsT0FBTyxDQUFDbUksYUFBVixFQUF5QjNKLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0N2QixJQUFwQyxDQUF5QyxNQUF6QyxDQUFyQjtBQUNBLFlBQUkyTCxVQUFVLEdBQU9wSyxDQUFDLENBQUV3QixPQUFPLENBQUNtSSxhQUFWLEVBQXlCM0osQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ3ZCLElBQXBDLENBQXlDLFVBQXpDLENBQXJCO0FBQ0EsWUFBSXNHLGNBQWMsR0FBR2lGLFFBQVEsQ0FBQ2xGLEtBQVQsQ0FBZSxLQUFmLEVBQXNCLENBQXRCLENBQXJCOztBQUVBLFlBQUtDLGNBQWMsSUFBSSxXQUF2QixFQUFxQztBQUNwQ2tGLFVBQUFBLEtBQUssR0FBR0MsV0FBUjtBQUNBbEssVUFBQUEsQ0FBQyxDQUFFd0IsT0FBTyxDQUFDbUksYUFBVixFQUF5QjNKLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0N1RSxXQUFwQyxDQUFpRCxTQUFqRDtBQUNBLFNBSEQsTUFHTyxJQUFLUSxjQUFjLElBQUksVUFBdkIsRUFBb0M7QUFDMUNrRixVQUFBQSxLQUFLLEdBQUdFLFVBQVI7QUFDQW5LLFVBQUFBLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQ21JLGFBQVYsRUFBeUIzSixDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9Dd0UsUUFBcEMsQ0FBOEMsU0FBOUM7QUFDQSxTQUhNLE1BR0EsSUFBSU8sY0FBYyxJQUFJLFVBQXRCLEVBQW1DO0FBQ3pDa0YsVUFBQUEsS0FBSyxHQUFHRyxVQUFSO0FBQ0FwSyxVQUFBQSxDQUFDLENBQUV3QixPQUFPLENBQUNtSSxhQUFWLEVBQXlCM0osQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ3dFLFFBQXBDLENBQTZDLFNBQTdDO0FBQ0E7O0FBRUR4RSxRQUFBQSxDQUFDLENBQUV3QixPQUFPLENBQUNtSSxhQUFWLEVBQXlCM0osQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ2lGLElBQXBDLENBQTBDZ0YsS0FBMUM7QUFFQSxPQXBCRDtBQXFCQSxLQS9KaUI7QUErSmY7QUFFSHZCLElBQUFBLGVBQWUsRUFBRSx5QkFBVW5ILE9BQVYsRUFBbUJDLE9BQW5CLEVBQTZCO0FBQzdDeEIsTUFBQUEsQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQjBHLEtBQWxCLENBQXdCLFlBQVc7QUFDbEMsWUFBSTJELFdBQVcsR0FBR3JLLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVWdELElBQVYsQ0FBZ0IsT0FBaEIsQ0FBbEI7QUFDQSxZQUFJa0csWUFBWSxHQUFHbUIsV0FBVyxDQUFDQSxXQUFXLENBQUNsSSxNQUFaLEdBQW9CLENBQXJCLENBQTlCO0FBQ0FuQyxRQUFBQSxDQUFDLENBQUV3QixPQUFPLENBQUM0SCw2QkFBVixFQUF5QzdILE9BQXpDLENBQUQsQ0FBbURnRCxXQUFuRCxDQUFnRSxTQUFoRTtBQUNBdkUsUUFBQUEsQ0FBQyxDQUFFd0IsT0FBTyxDQUFDZ0ksc0JBQVYsRUFBa0NqSSxPQUFsQyxDQUFELENBQTRDZ0QsV0FBNUMsQ0FBeUQsUUFBekQ7QUFDQXZFLFFBQUFBLENBQUMsQ0FBRXdCLE9BQU8sQ0FBQ2dJLHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDTixZQUF6QyxFQUF1RDNILE9BQXZELENBQUQsQ0FBa0VpRCxRQUFsRSxDQUE0RSxRQUE1RTtBQUNBeEUsUUFBQUEsQ0FBQyxDQUFFd0IsT0FBTyxDQUFDZ0ksc0JBQVIsR0FBaUMsR0FBakMsR0FBdUNOLFlBQXZDLEdBQXNELEdBQXRELEdBQTREMUgsT0FBTyxDQUFDNEgsNkJBQXRFLENBQUQsQ0FBdUc1RSxRQUF2RyxDQUFpSCxTQUFqSDtBQUNBLE9BUEQ7QUFRQSxLQTFLaUIsQ0EwS2Y7O0FBMUtlLEdBQW5CLENBbkNpRSxDQStNOUQ7QUFFSDtBQUNBOztBQUNBeEUsRUFBQUEsQ0FBQyxDQUFDa0csRUFBRixDQUFLaEcsVUFBTCxJQUFtQixVQUFXc0IsT0FBWCxFQUFxQjtBQUN2QyxXQUFPLEtBQUtvRCxJQUFMLENBQVUsWUFBWTtBQUM1QixVQUFLLENBQUU1RSxDQUFDLENBQUN2QixJQUFGLENBQVEsSUFBUixFQUFjLFlBQVl5QixVQUExQixDQUFQLEVBQWdEO0FBQy9DRixRQUFBQSxDQUFDLENBQUN2QixJQUFGLENBQVEsSUFBUixFQUFjLFlBQVl5QixVQUExQixFQUFzQyxJQUFJb0IsTUFBSixDQUFZLElBQVosRUFBa0JFLE9BQWxCLENBQXRDO0FBQ0E7QUFDRCxLQUpNLENBQVA7QUFLQSxHQU5EO0FBUUEsQ0EzTkEsRUEyTkcyRSxNQTNOSCxFQTJOVzVILE1BM05YLEVBMk5tQjBCLFFBM05uQixFQTJONkJ6QixrQkEzTjdCOzs7QUNERDtBQUNBOztBQUFDLENBQUMsVUFBV3dCLENBQVgsRUFBY3pCLE1BQWQsRUFBc0IwQixRQUF0QixFQUFpQztBQUNsQztBQUNBLE1BQUlDLFVBQVUsR0FBRyxxQkFBakI7QUFBQSxNQUNBQyxRQUFRLEdBQUc7QUFDVmpCLElBQUFBLElBQUksRUFBRSxPQURJO0FBRVYrSSxJQUFBQSxRQUFRLEVBQUUsWUFGQTtBQUdWQyxJQUFBQSxNQUFNLEVBQUUsaUJBSEU7QUFJVkMsSUFBQUEsS0FBSyxFQUFFNUIsUUFBUSxDQUFDOEI7QUFKTixHQURYLENBRmtDLENBVWxDOztBQUNBLFdBQVMvRyxNQUFULENBQWlCQyxPQUFqQixFQUEwQkMsT0FBMUIsRUFBb0M7QUFDbkMsU0FBS0QsT0FBTCxHQUFlQSxPQUFmLENBRG1DLENBR25DO0FBQ0E7QUFDQTtBQUNBOztBQUNBLFNBQUtDLE9BQUwsR0FBZXhCLENBQUMsQ0FBQ3lCLE1BQUYsQ0FBVSxFQUFWLEVBQWN0QixRQUFkLEVBQXdCcUIsT0FBeEIsQ0FBZjtBQUVBLFNBQUtFLFNBQUwsR0FBaUJ2QixRQUFqQjtBQUNBLFNBQUt3QixLQUFMLEdBQWF6QixVQUFiO0FBRUEsU0FBSzBCLElBQUw7QUFDQSxHQXhCaUMsQ0F3QmhDOzs7QUFFRk4sRUFBQUEsTUFBTSxDQUFDeEMsU0FBUCxHQUFtQjtBQUNsQjhDLElBQUFBLElBQUksRUFBRSxnQkFBWTtBQUNqQixVQUFJNkMsSUFBSSxHQUFHLElBQVg7QUFDQSxVQUFJakQsT0FBTyxHQUFHLEtBQUtBLE9BQW5CO0FBRUF4QixNQUFBQSxDQUFDLENBQUUsS0FBS3VCLE9BQVAsQ0FBRCxDQUFrQitJLE1BQWxCLENBQTBCLFVBQVU3RyxLQUFWLEVBQWtCO0FBQzNDO0FBQ0E7QUFDQWdCLFFBQUFBLElBQUksQ0FBQzhGLG1CQUFMLENBQ0MvSSxPQUFPLENBQUN0QyxJQURULEVBRUNzQyxPQUFPLENBQUN5RyxRQUZULEVBR0N6RyxPQUFPLENBQUMwRyxNQUhULEVBSUMxRyxPQUFPLENBQUMyRyxLQUpULEVBSDJDLENBUzNDOztBQUNBMUQsUUFBQUEsSUFBSSxDQUFDK0YsdUJBQUwsQ0FBOEJ4SyxDQUFDLENBQUV5RSxJQUFJLENBQUNsRCxPQUFQLENBQS9CO0FBQ0EsT0FYRDtBQVlBLEtBakJpQjtBQW1CbEJnSixJQUFBQSxtQkFBbUIsRUFBRSw2QkFBVXJMLElBQVYsRUFBZ0IrSSxRQUFoQixFQUEwQkMsTUFBMUIsRUFBa0NDLEtBQWxDLEVBQXlDQyxLQUF6QyxFQUFpRDtBQUNyRSxVQUFLLE9BQU9oRyxFQUFQLEtBQWMsV0FBbkIsRUFBaUM7QUFDaEM7QUFDQTs7QUFFRCxVQUFLLE9BQU9nRyxLQUFQLEtBQWlCLFdBQXRCLEVBQW9DO0FBQ25DaEcsUUFBQUEsRUFBRSxDQUFFLE1BQUYsRUFBVWxELElBQVYsRUFBZ0IrSSxRQUFoQixFQUEwQkMsTUFBMUIsRUFBa0NDLEtBQWxDLENBQUY7QUFDQTtBQUNBOztBQUVEL0YsTUFBQUEsRUFBRSxDQUFFLE1BQUYsRUFBVWxELElBQVYsRUFBZ0IrSSxRQUFoQixFQUEwQkMsTUFBMUIsRUFBa0NDLEtBQWxDLEVBQXlDQyxLQUF6QyxDQUFGO0FBQ0EsS0E5QmlCO0FBOEJmO0FBRUhvQyxJQUFBQSx1QkFBdUIsRUFBRSxpQ0FBVWpKLE9BQVYsRUFBb0I7QUFDNUMsVUFBSyxPQUFPYSxFQUFQLEtBQWMsV0FBbkIsRUFBaUM7QUFDaEM7QUFDQTs7QUFDREEsTUFBQUEsRUFBRSxDQUFFLFNBQUYsRUFBYSxJQUFiLENBQUY7O0FBQ0EsVUFBS2IsT0FBTyxDQUFDa0osUUFBUixDQUFrQiwyQkFBbEIsQ0FBTCxFQUF1RDtBQUN0RHJJLFFBQUFBLEVBQUUsQ0FBRSxjQUFGLEVBQWtCLFVBQWxCLEVBQThCO0FBQy9CLGtCQUFRO0FBRHVCLFNBQTlCLENBQUY7QUFHQTtBQUNELEtBMUNpQixDQTBDZjs7QUExQ2UsR0FBbkIsQ0ExQmtDLENBc0UvQjtBQUdIO0FBQ0E7O0FBQ0FwQyxFQUFBQSxDQUFDLENBQUNrRyxFQUFGLENBQUtoRyxVQUFMLElBQW1CLFVBQVdzQixPQUFYLEVBQXFCO0FBQ3ZDLFdBQU8sS0FBS29ELElBQUwsQ0FBVSxZQUFZO0FBQzVCLFVBQUssQ0FBRTVFLENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0NGLFFBQUFBLENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLEVBQXNDLElBQUlvQixNQUFKLENBQVksSUFBWixFQUFrQkUsT0FBbEIsQ0FBdEM7QUFDQTtBQUNELEtBSk0sQ0FBUDtBQUtBLEdBTkQ7QUFPQSxDQWxGQSxFQWtGRzJFLE1BbEZILEVBa0ZXNUgsTUFsRlgsRUFrRm1CMEIsUUFsRm5CIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiOyhmdW5jdGlvbiAoIHdpbmRvdyApIHtcblx0ZnVuY3Rpb24gTWlublBvc3RNZW1iZXJzaGlwKCBkYXRhLCBzZXR0aW5ncyApIHtcblx0XHR0aGlzLmRhdGEgPSB7fTtcblx0XHRpZiAodHlwZW9mIGRhdGEgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLmRhdGEgPSBkYXRhO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0dGluZ3MgPSB7fTtcblx0XHRpZiAodHlwZW9mIHNldHRpbmdzICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdH1cblxuXHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSAnJztcblx0XHRpZiAoIHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyICE9PSAndW5kZWZpbmVkJyAmJlxuXHRcdCAgICAgdHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHR9XG5cdH1cblxuXHRNaW5uUG9zdE1lbWJlcnNoaXAucHJvdG90eXBlID0ge1xuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSApIHtcblx0XHRcdHZhciB0aGlzeWVhciA9IHBhcnNlSW50KCBhbW91bnQgKSAqIHBhcnNlSW50KCBmcmVxdWVuY3kgKTtcblx0XHRcdGlmICggdHlwZW9mIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICcnICkge1xuXHRcdFx0XHR2YXIgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMsIDEwICk7XG5cdFx0XHRcdHZhciBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zLCAxMCApO1xuXHRcdFx0XHR2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCwgMTAgKTtcblx0XHRcdFx0Ly8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0XHRcdGlmICggdHlwZSA9PT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXN5ZWFyID0gTWF0aC5tYXgoIHByaW9yX3llYXJfYW1vdW50LCBjb21pbmdfeWVhcl9hbW91bnQsIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0aGlzLmdldExldmVsKCB0aGlzeWVhciApO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0ge1xuXHRcdFx0XHQneWVhcmx5QW1vdW50JzogdGhpc3llYXJcblx0XHRcdH07XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cdH07XG5cblx0d2luZG93Lk1pbm5Qb3N0TWVtYmVyc2hpcCA9IG5ldyBNaW5uUG9zdE1lbWJlcnNoaXAoXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSxcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5nc1xuXHQpO1xufSkoIHdpbmRvdyApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RBbW91bnRTZWxlY3QnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHRmcmVxdWVuY3lTZWxlY3RvcjogJy5tLWZyZXF1ZW5jeS1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRhbW91bnRHcm91cDogJy5tLWZyZXF1ZW5jeS1ncm91cCcsXG5cdFx0YW1vdW50U2VsZWN0b3I6ICcubS1hbW91bnQtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50TGFiZWxzOiAnLm0tYW1vdW50LXNlbGVjdCBsYWJlbCcsXG5cdFx0YW1vdW50VmFsdWU6ICdzdHJvbmcnLFxuXHRcdGFtb3VudERlc2NyaXB0aW9uOiAnLmEtYW1vdW50LWRlc2NyaXB0aW9uJyxcblx0XHRhbW91bnRGaWVsZDogJy5hLWFtb3VudC1maWVsZCAjYW1vdW50Jyxcblx0XHRsZXZlbFZpZXdlcjogJy5hLXNob3ctbGV2ZWwnLFxuXHRcdGxldmVsTmFtZTogJy5hLWxldmVsJyxcblx0XHR1c2VyQ3VycmVudExldmVsOiAnLmEtY3VycmVudC1sZXZlbCcsXG5cdFx0ZGVjbGluZUJlbmVmaXRzOiAnLm0tZGVjbGluZS1iZW5lZml0cy1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRnaWZ0U2VsZWN0aW9uR3JvdXA6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3InLFxuXHRcdHN3YWdTZWxlY3RvcjogJy5tLXNlbGVjdC1zd2FnIGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0c3dhZ0xhYmVsczogJy5tLXNlbGVjdC1zd2FnIGlucHV0W3R5cGU9XCJyYWRpb1wiXSArIGxhYmVsJyxcblx0XHRzdWJzY3JpcHRpb25zU2VsZWN0b3I6ICcubS1zZWxlY3Qtc3Vic2NyaXB0aW9uIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScsXG5cdFx0c3Vic2NyaXB0aW9uc0xhYmVsczogJy5tLXNlbGVjdC1zdWJzY3JpcHRpb24gaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdICsgbGFiZWwnLFxuXHRcdHRvb2x0aXBUZXh0QW1vdW50SW5MYWJlbDogJy50b29sdGlwLXRleHQgLm1pbi1hbW91bnQnLFxuXHRcdGRlY2xpbmVTdWJzY3JpcHRpb25zOiAnI3N1YnNjcmlwdGlvbi1kZWNsaW5lJ1xuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJGZyZXF1ZW5jeSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciApO1xuXHRcdFx0dmFyICRzdWdnZXN0ZWRBbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblx0XHRcdHZhciAkYW1vdW50ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICk7XG5cdFx0XHR2YXIgJGRlY2xpbmVCZW5lZml0cyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMgKTtcblx0XHRcdHZhciAkc3Vic2NyaXB0aW9ucyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKTtcblx0XHRcdGlmICggISggJGFtb3VudC5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICAgICRmcmVxdWVuY3kubGVuZ3RoID4gMCAmJlxuXHRcdFx0ICAgICAgICAkc3VnZ2VzdGVkQW1vdW50Lmxlbmd0aCA+IDAgKSApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzZXR1cCBBbmFseXRpY3MgRW5oYW5jZWQgRWNvbW1lcmNlIHBsdWdpblxuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRnYSggJ3JlcXVpcmUnLCAnZWMnICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoICRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoKTtcblxuXHRcdFx0JGZyZXF1ZW5jeS5vbiggJ2NoYW5nZScsIHRoaXMub25GcmVxdWVuY3lDaGFuZ2UuYmluZCh0aGlzKSApO1xuXHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5vbiggJ2NoYW5nZScsIHRoaXMub25TdWdnZXN0ZWRBbW91bnRDaGFuZ2UuYmluZCh0aGlzKSApO1xuXHRcdFx0JGFtb3VudC5vbiggJ2tleXVwIG1vdXNldXAnLCB0aGlzLm9uQW1vdW50Q2hhbmdlLmJpbmQodGhpcykgKTtcblxuXHRcdFx0aWYgKCAhICggJGRlY2xpbmVCZW5lZml0cy5sZW5ndGggPiAwICYmICRzdWJzY3JpcHRpb25zLmxlbmd0aCA+IDAgKSApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgdGhlIFVJIGZvciB0aGUgY3VycmVudCBmaWVsZCBzdGF0ZSBvbiAocmUtKWxvYWRcblx0XHRcdGlmICggJHN1YnNjcmlwdGlvbnMubm90KCB0aGlzLm9wdGlvbnMuZGVjbGluZVN1YnNjcmlwdGlvbnMgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHQkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZGVjbGluZVN1YnNjcmlwdGlvbnMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLm9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlKCk7XG5cblx0XHRcdCRkZWNsaW5lQmVuZWZpdHMub24oICdjaGFuZ2UnLCB0aGlzLm9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlLmJpbmQoIHRoaXMgKSApO1xuXHRcdFx0JHN1YnNjcmlwdGlvbnMub24oICdjbGljaycsIHRoaXMub25TdWJzY3JpcHRpb25zQ2xpY2suYmluZCggdGhpcyApICk7XG5cdFx0fSwgLy8gZW5kIGluaXRcblxuXHRcdCAvLyBzdGVwIGlzIHRoZSBpbnRlZ2VyIGZvciB0aGUgc3RlcCBpbiB0aGUgZWNvbW1lcmNlIHByb2Nlc3MuXG5cdFx0IC8vIGZvciB0aGlzIHB1cnBvc2UsIGl0J3MgcHJvYmFibHkgYWx3YXlzIDEuXG5cdFx0IC8vIHRoaW5ncyB3ZSBuZWVkIHRvIGtub3c6IHRoZSBsZXZlbCBuYW1lLCB0aGUgYW1vdW50LCBhbmQgdGhlIGZyZXF1ZW5jeVxuXHRcdCAvLyBleGFtcGxlOlxuXHRcdCAvKlxuXHRcdCBSdW5uaW5nIGNvbW1hbmQ6IGdhKFwiZWM6YWRkUHJvZHVjdFwiLCB7aWQ6IFwibWlubnBvc3Rfc2lsdmVyX21lbWJlcnNoaXBcIiwgbmFtZTogXCJNaW5uUG9zdCBTaWx2ZXIgTWVtYmVyc2hpcFwiLCBjYXRlZ29yeTogXCJEb25hdGlvblwiLCBicmFuZDogXCJNaW5uUG9zdFwiLCB2YXJpYW50OiBcIk1vbnRobHlcIiwgcHJpY2U6IFwiNVwiLCBxdWFudGl0eTogMX0pXG5cdFx0ICovXG5cdFx0YW5hbHl0aWNzVHJhY2tlcjogZnVuY3Rpb24oIGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdlYzphZGRQcm9kdWN0Jywge1xuXHRcdFx0XHRcdCdpZCc6ICdtaW5ucG9zdF8nICsgbGV2ZWwudG9Mb3dlckNhc2UoKSArICdfbWVtYmVyc2hpcCcsXG5cdFx0XHRcdFx0J25hbWUnOiAnTWlublBvc3QgJyArIGxldmVsLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbGV2ZWwuc2xpY2UoMSkgKyAnIE1lbWJlcnNoaXAnLFxuXHRcdFx0XHRcdCdjYXRlZ29yeSc6ICdEb25hdGlvbicsXG5cdFx0XHRcdFx0J2JyYW5kJzogJ01pbm5Qb3N0Jyxcblx0XHRcdFx0XHQndmFyaWFudCc6ICBmcmVxdWVuY3lfbGFiZWwsXG5cdFx0XHRcdFx0J3ByaWNlJzogYW1vdW50LFxuXHRcdFx0XHRcdCdxdWFudGl0eSc6IDFcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc1RyYWNrZXJcblxuXHRcdG9uRnJlcXVlbmN5Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscyggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgKTtcblx0XHRcdHRoaXMuc2V0VG9vbHRpcEFtb3VudHMoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoKTtcblx0XHR9LCAvLyBlbmQgb25GcmVxdWVuY3lDaGFuZ2VcblxuXHRcdG9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKS52YWwoIG51bGwgKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXHRcdH0sIC8vIGVuZCBvblN1Z2dlc3RlZEFtb3VudENoYW5nZVxuXG5cdFx0b25BbW91bnRDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuY2xlYXJBbW91bnRTZWxlY3RvciggZXZlbnQgKTtcblxuXHRcdFx0dmFyICR0YXJnZXQgPSAkKCBldmVudC50YXJnZXQgKTtcblx0XHRcdGlmICggJHRhcmdldC5kYXRhKCAnbGFzdC12YWx1ZScgKSAhPSAkdGFyZ2V0LnZhbCgpICkge1xuXHRcdFx0XHQkdGFyZ2V0LmRhdGEoICdsYXN0LXZhbHVlJywgJHRhcmdldC52YWwoKSApO1xuXHRcdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgb25BbW91bnRDaGFuZ2VcblxuXHRcdG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJGdpZnRTZWxlY3Rpb25Hcm91cCA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5naWZ0U2VsZWN0aW9uR3JvdXAgKTtcblx0XHRcdHZhciBkZWNsaW5lID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cyApLmZpbHRlciggJzpjaGVja2VkJyApLnZhbCgpO1xuXG5cdFx0XHRpZiAoIGRlY2xpbmUgPT09ICd0cnVlJyApIHtcblx0XHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5oaWRlKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5zaG93KCk7XG5cdFx0fSwgLy8gZW5kIG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlXG5cblx0XHRvblN1YnNjcmlwdGlvbnNDbGljazogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRzdWJzY3JpcHRpb25zID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLnN1YnNjcmlwdGlvbnNTZWxlY3RvciApLm5vdCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICk7XG5cdFx0XHR2YXIgJGRlY2xpbmUgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZGVjbGluZVN1YnNjcmlwdGlvbnMgKTtcblxuXHRcdFx0aWYgKCAkKCBldmVudC50YXJnZXQgKS5pcyggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICkgKSB7XG5cdFx0XHRcdCRzdWJzY3JpcHRpb25zLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkZGVjbGluZS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0fSwgLy8gZW5kIG9uU3Vic2NyaXB0aW9uc0NoYW5nZVxuXG5cdFx0Y2xlYXJBbW91bnRTZWxlY3RvcjogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRzdWdnZXN0ZWRBbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblxuXHRcdFx0aWYgKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSA9PT0gJycgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0fSwgLy8gZW5kIGNsZWFyQW1vdW50U2VsZWN0b3JcblxuXHRcdHNldEFtb3VudExhYmVsczogZnVuY3Rpb24oIGZyZXF1ZW5jeVN0cmluZyApIHtcblx0XHRcdHZhciAkZ3JvdXBzID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEdyb3VwICk7XG5cdFx0XHR2YXIgJHNlbGVjdGVkID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yIClcblx0XHRcdCAgICAuZmlsdGVyKCAnOmNoZWNrZWQnICk7XG5cdFx0XHR2YXIgaW5kZXggPSAkc2VsZWN0ZWQuZGF0YSggJ2luZGV4JyApO1xuXG5cdFx0XHQkZ3JvdXBzLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScgKVxuXHRcdFx0XHQuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkc2VsZWN0ZWQucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICcuYWN0aXZlJyApXG5cdFx0XHRcdC5maW5kKCAnaW5wdXRbdHlwZT1cInJhZGlvXCJdW2RhdGEtaW5kZXg9XCInICsgaW5kZXggKyAnXCJdJyApXG5cdFx0XHRcdC5wcm9wKCAnY2hlY2tlZCcsIHRydWUgKTtcblx0XHR9LCAvLyBlbmQgc2V0QW1vdW50TGFiZWxzXG5cblx0XHRzZXRUb29sdGlwQW1vdW50czogZnVuY3Rpb24oIGZyZXF1ZW5jeVN0cmluZyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBzZXRBY3RpdmVBbW91bnRzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciAkZWxlbWVudHMgPSAkKCB0aGlzICkuZmluZCggdGhhdC5vcHRpb25zLnRvb2x0aXBUZXh0QW1vdW50SW5MYWJlbCApO1xuXHRcdFx0XHQkZWxlbWVudHMucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCRlbGVtZW50cy5maWx0ZXIoICdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScgKVxuXHRcdFx0XHRcdC5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdH07XG5cdFx0XHQkKCB0aGlzLm9wdGlvbnMuc3dhZ0xhYmVscyApLmVhY2goIHNldEFjdGl2ZUFtb3VudHMgKTtcblx0XHRcdCQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zTGFiZWxzICkuZWFjaCggc2V0QWN0aXZlQW1vdW50cyApO1xuXHRcdH0sIC8vIGVuZCBzZXRUb29sdGlwQW1vdW50c1xuXG5cdFx0Y2hlY2tBbmRTZXRMZXZlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICkuZmlsdGVyKCAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHRpZiAoIHR5cGVvZiBhbW91bnQgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKS52YWwoKTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfaWQgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkucHJvcCggJ2lkJyApO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9sYWJlbCA9ICQoICdsYWJlbFtmb3I9XCInICsgZnJlcXVlbmN5X2lkICsgJ1wiXScgKS50ZXh0KCk7XG5cblx0XHRcdHZhciBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUgKTtcblx0XHRcdHRoaXMuc2hvd05ld0xldmVsKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdHRoaXMuc2V0RW5hYmxlZEdpZnRzKCBsZXZlbCApO1xuXHRcdFx0dGhpcy5hbmFseXRpY3NUcmFja2VyKCBsZXZlbFsnbmFtZSddLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApO1xuXHRcdH0sIC8vIGVuZCBjaGVja0FuZFNldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHR2YXIgZGVjb2RlSHRtbEVudGl0eSA9IGZ1bmN0aW9uKCBzdHIgKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSggLyYjKFxcZCspOy9nLCBmdW5jdGlvbiggbWF0Y2gsIGRlYyApIHtcblx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSggZGVjICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxWaWV3ZXIpLnByb3AoICdjbGFzcycsICdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKTtcblxuXHRcdFx0XHRpZiAoICQoIG9wdGlvbnMudXNlckN1cnJlbnRMZXZlbCApLmxlbmd0aCA+IDAgJiYgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHRcdGlmICggJ2EnLCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdGxldmVsVmlld2VyQ29udGFpbmVyID0gb3B0aW9ucy5sZXZlbFZpZXdlciArICcgYSc7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b2xkX2xldmVsID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZSggbWVtYmVyX2xldmVsX3ByZWZpeCwgJycgKTtcblxuXHRcdFx0XHRcdGlmICggb2xkX2xldmVsICE9PSBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbFZpZXdlckNvbnRhaW5lciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5kYXRhKCAnY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsVmlld2VyQ29udGFpbmVyICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmRhdGEoICdub3QtY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsTmFtZSwgb3B0aW9ucy5sZXZlbFZpZXdlcikudGV4dCggbGV2ZWxbJ25hbWUnXSApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdHNldEVuYWJsZWRHaWZ0czogZnVuY3Rpb24oIGxldmVsICkge1xuXHRcdFx0dmFyIHNldEVuYWJsZWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggdGhpcyApLnByb3AoICdkaXNhYmxlZCcsIGxldmVsLnllYXJseUFtb3VudCA8ICQoIHRoaXMgKS5kYXRhKCAnbWluWWVhcmx5QW1vdW50JyApICk7XG5cdFx0XHR9O1xuXG5cdFx0XHQkKCB0aGlzLm9wdGlvbnMuc3dhZ1NlbGVjdG9yICkuZWFjaCggc2V0RW5hYmxlZCApO1xuXHRcdFx0JCggdGhpcy5vcHRpb25zLnN1YnNjcmlwdGlvbnNTZWxlY3RvciApLmVhY2goIHNldEVuYWJsZWQgKTtcblx0XHR9LCAvLyBlbmQgc2V0RW5hYmxlZEdpZnRzXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHRpZiAoIDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSApIHtcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCggdHJ1ZSApO1xuXHRcdH1cblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciAkc3RhdHVzICA9ICQoICcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciAkc2VsZWN0ICA9ICQoICdzZWxlY3QnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICggISAnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnICkge1xuXHRcdFx0XHQkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLnJlbW92ZUNsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJyApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoICdQcm9jZXNzaW5nJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIGRpc2FibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0dmFyIGRhdGEgPSB7fTtcblx0XHRcdHZhciBiZW5lZml0VHlwZSA9ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJyApLnZhbCgpO1xuXHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdFx0ZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdFx0XHQnbWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2UnIDogJGJ1dHRvbi5kYXRhKCAnYmVuZWZpdC1ub25jZScgKSxcblx0XHRcdFx0XHQnY3VycmVudF91cmwnIDogJCggJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdiZW5lZml0LW5hbWUnOiAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdpbnN0YW5jZV9pZCcgOiAkKCAnW25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHRcdFx0J3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdFx0XHQnaXNfYWpheCcgOiAnMScsXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0XHRcdGlmICggMCA8ICRzZWxlY3QubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0XHQkc2VsZWN0LnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkuYXR0ciggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBlcnJvclxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCQoICdvcHRpb24nLCAkc2VsZWN0ICkuZWFjaCggZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAkKCB0aGlzICkudmFsKCkgPT09IHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHRcdGlmICggMCA8ICQoICcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcgKS5sZW5ndGggKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0fSk7XG5cblx0JCggJy5hLXJlZnJlc2gtcGFnZScgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblx0ZnVuY3Rpb24gbXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkgeyBcblx0XHQkKCAnLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSAnJztcblx0XHRcdGlmICggJCggJ3N2ZycsICQoIHRoaXMgKSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHZhbHVlID0gJCggJ3N2ZycsICQoIHRoaXMgKSApLmF0dHIoICd0aXRsZScgKSArICcgJztcblx0XHRcdH1cblx0XHRcdHZhbHVlID0gdmFsdWUgKyAkKCB0aGlzICkudGV4dCgpO1xuXHRcdFx0bXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoICdldmVudCcsICdTdXBwb3J0IENUQSAtIEhlYWRlcicsICdDbGljazogJyArIHZhbHVlLCBsb2NhdGlvbi5wYXRobmFtZSApO1xuXHRcdH0pO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdFx0aWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHRcdHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICk7XG5cblx0XHRcdCQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdFx0dmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0XHR2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0XHR2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHRcdHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50ICkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RUcmFja1N1Ym1pdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdHR5cGU6ICdldmVudCcsXG5cdFx0Y2F0ZWdvcnk6ICdTdXBwb3J0IFVzJyxcblx0XHRhY3Rpb246ICdCZWNvbWUgQSBNZW1iZXInLFxuXHRcdGxhYmVsOiBsb2NhdGlvbi5wYXRobmFtZVxuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG5cblx0XHRcdCQoIHRoaXMuZWxlbWVudCApLnN1Ym1pdCggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHQvLyB0aGlzIHRyYWNrcyBhbiBldmVudCBzdWJtaXNzaW9uIGJhc2VkIG9uIHRoZSBwbHVnaW4gb3B0aW9uc1xuXHRcdFx0XHQvLyBpdCBhbHNvIGJ1YmJsZXMgdGhlIGV2ZW50IHVwIHRvIHN1Ym1pdCB0aGUgZm9ybVxuXHRcdFx0XHR0aGF0LmFuYWx5dGljc0V2ZW50VHJhY2soXG5cdFx0XHRcdFx0b3B0aW9ucy50eXBlLFxuXHRcdFx0XHRcdG9wdGlvbnMuY2F0ZWdvcnksXG5cdFx0XHRcdFx0b3B0aW9ucy5hY3Rpb24sXG5cdFx0XHRcdFx0b3B0aW9ucy5sYWJlbFxuXHRcdFx0XHQpO1xuXHRcdFx0XHQvLyBpZiB0aGlzIGlzIHRoZSBtYWluIGNoZWNrb3V0IGZvcm0sIHNlbmQgaXQgdG8gdGhlIGVjIHBsdWdpbiBhcyBhIGNoZWNrb3V0XG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRWNvbW1lcmNlVHJhY2soICQoIHRoYXQuZWxlbWVudCApICk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0YW5hbHl0aWNzRXZlbnRUcmFjazogZnVuY3Rpb24oIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICk7XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc0V2ZW50VHJhY2tcblxuXHRcdGFuYWx5dGljc0Vjb21tZXJjZVRyYWNrOiBmdW5jdGlvbiggZWxlbWVudCApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Z2EoICdyZXF1aXJlJywgJ2VjJyApO1xuXHRcdFx0aWYgKCBlbGVtZW50Lmhhc0NsYXNzKCAnbS1mb3JtLW1lbWJlcnNoaXAtc3VwcG9ydCcgKSApIHtcblx0XHRcdFx0Z2EoICdlYzpzZXRBY3Rpb24nLCAnY2hlY2tvdXQnLCB7XG5cdFx0XHRcdFx0J3N0ZXAnOiAxLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzRWNvbW1lcmNlVHJhY2tcblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iXX0=
