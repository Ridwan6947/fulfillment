import OrderState from "./modules/order/OrderState";
import UtilState from "./modules/util/UtilState";

export default interface RootState {
    user: any;
    product: any;
    order: OrderState;
    util: UtilState;
}