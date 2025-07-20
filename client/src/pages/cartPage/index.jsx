import { useState, useEffect } from 'react'
import HeroText from '../../components/HeroText'
import api from '../../config/apiConfig'
import { Link } from 'react-router'
import { Card } from '../../components/ui/apple-cards-carousel'
import useCartStore from '../../store/cart.store'
import { Button } from '../../components/ui/button'
import { ArrowRight } from 'lucide-react'

const CartPage = () => {
    const [data, setData] = useState([]);
    const cart = useCartStore(state => state.cart);
    const clearCart = useCartStore(state => state.clearCart);
    const getTotalItems = useCartStore(state => state.getTotalItems);
    const getTotalPrice = useCartStore(state => state.getTotalPrice);

    useEffect(() => {
        (async () => {
            try {
                const req = await fetch(api.getUrl('collections'));
                const response = await req.json();

                if (req.ok) {
                    const { data, pagination, success } = response;
                    setData(data);
                } else {
                    setData([]);
                }
            } catch (error) {
                console.error('Fetch error:', error);
                setData([]);
            }
        })();
    }, []);

    const handleClearCart = () => {
        if (window.confirm('Are you sure you want to clear your cart?')) {
            clearCart();
        }
    };

    const handleCheckout = () => {
        // Navigate to checkout page or handle checkout logic
        console.log('Proceeding to checkout...');
    };

    return (
        <section>
            {cart && cart.length > 0 ? (
                <div className="container relative py-24 px-4">
                    <div className="mx-auto text-center">
                        <HeroText
                            classname="max-w-3xl mx-auto"
                            header={`Your Cart (${getTotalItems ? getTotalItems() : cart.length} items)`}
                            cta={{
                                variant: 'ghost',
                                ctaText: "Continue Shopping",
                                href: '/collections'
                            }}
                        />
                    </div>

                    {/* Cart Summary */}
                    <div className="max-w-4xl mx-auto mt-8 mb-8">
                        <div className=" p-6 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">Cart Summary</h3>
                                <button
                                    onClick={handleClearCart}
                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                    Clear Cart
                                </button>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-600">
                                    Total Items: {getTotalItems ? getTotalItems() : cart.length}
                                </span>
                                {getTotalPrice && (
                                    <span className="text-xl font-bold">
                                        ${getTotalPrice().toFixed(2)}
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-4 justify-end">
                                {/* <Link
                                    to="/collections"
                                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Continue Shopping
                                </Link> */}

                                <Link to={'/collections'} className='hidden md:block transition-all duration-200'>
                                    <Button className='gap2 group transition-all duration-300 hover:bg-black hover:border-white hover:border-2 hover:text-white'>
                                        <span>Continue Shopping</span>
                                        {/* <span><ArrowRight className='w-6 h-6 aspect-square group-hover:translate-x-2 duration-150' /></span> */}
                                    </Button>
                                </Link>
                                <Button
                                    onClick={handleCheckout}
                                    // className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    className='gap2 group transition-all duration-300 hover:bg-black hover:border-white hover:border-2 hover:text-white inver bg-green-300'
                                >
                                    Proceed to Checkout
                                    <span><ArrowRight className='w-6 h-6 aspect-square group-hover:translate-x-2 duration-150' /></span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="lg:mt-16">
                        <div className="flex flex-col md:flex-row flex-wrap gap-5 justify-center items-center">
                            {cart.map((item, index) => (
                                <Link key={item.id || index} to={`/collections/${item.id}`}>
                                    <Card index={index} card={item} />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="container relative py-24 px-4">
                    <div className="mx-auto text-center">
                        <HeroText
                            classname="max-w-3xl mx-auto"
                            header='Your Cart is Empty'
                            subheader='Add some items to your cart to see them here'
                            cta={{
                                variant: 'primary',
                                ctaText: "Start Shopping",
                                href: '/collections'
                            }}
                        />
                    </div>

                    {/* Show some featured collections when cart is empty */}
                    {data && data.length > 0 && (
                        <div className="lg:mt-16">
                            <h3 className="text-2xl font-semibold text-center mb-8">
                                Featured Collections
                            </h3>
                            <div className="flex flex-col md:flex-row flex-wrap gap-5 justify-center items-center">
                                {data.slice(0, 3).map((item, index) => (
                                    <Link key={item.id || index} to={`/collections/${item.id}`}>
                                        <Card index={index} card={item} />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}

export default CartPage